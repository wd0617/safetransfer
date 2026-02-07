/**
 * Transfer Service
 * Capa de servicio para operaciones relacionadas con transferencias
 * Separa la lógica de negocio de los componentes de UI
 */

import { supabase } from './supabase';
import { Database } from './database.types';
import { sanitizeObject } from './sanitize';
import { appCache, CACHE_KEYS, CACHE_TTL, cacheInvalidation } from './cache';

type Transfer = Database['public']['Tables']['transfers']['Row'];
type TransferInsert = Database['public']['Tables']['transfers']['Insert'];

export interface EligibilityResult {
    can_transfer: boolean;
    amount_used: number;
    amount_available: number;
    message: string;
    days_remaining: number;
    days_until_available?: number;
}

export interface TransferServiceResult<T> {
    data: T | null;
    error: string | null;
}

// Constantes de negocio
export const TRANSFER_LIMITS = {
    MAX_AMOUNT_PER_TRANSFER: 999,
    MAX_WEEKLY_AMOUNT: 999,
    COOLDOWN_DAYS: 8,
} as const;

/**
 * Verifica la elegibilidad de un cliente para realizar una transferencia
 * Utiliza la función RPC de Supabase para verificar los límites de privacidad
 * Usa caché corto (30s) para evitar llamadas excesivas
 */
export async function checkTransferEligibility(
    documentNumber: string,
    businessId: string,
    userId: string,
    requestedAmount: number,
    options?: { skipCache?: boolean }
): Promise<TransferServiceResult<EligibilityResult>> {
    const cacheKey = CACHE_KEYS.eligibility(documentNumber, businessId);

    // Verificar caché primero (TTL corto porque son datos sensibles)
    if (!options?.skipCache) {
        const cached = appCache.get<EligibilityResult>(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }
    }

    try {
        const { data, error } = await supabase.rpc('check_transfer_eligibility_private', {
            p_document_number: documentNumber,
            p_checking_business_id: businessId,
            p_checked_by_user_id: userId,
            p_requested_amount: requestedAmount || 0,
        });

        if (error) throw error;

        if (data && data.length > 0) {
            const eligibility = data[0] as EligibilityResult;
            // Guardar en caché con TTL corto
            appCache.set(cacheKey, eligibility, CACHE_TTL.ELIGIBILITY);
            return { data: eligibility, error: null };
        }

        return { data: null, error: 'No eligibility data returned' };
    } catch (err: any) {
        console.error('Error checking eligibility:', err);
        return { data: null, error: err.message || 'Error checking eligibility' };
    }
}

/**
 * Valida si una transferencia cumple con los requisitos legales
 */
export function validateTransferAmount(
    amount: number,
    currentUsed: number
): { isValid: boolean; error?: string } {
    if (amount <= 0) {
        return { isValid: false, error: 'Amount must be greater than 0' };
    }

    if (amount > TRANSFER_LIMITS.MAX_AMOUNT_PER_TRANSFER) {
        return {
            isValid: false,
            error: `Amount exceeds legal limit of €${TRANSFER_LIMITS.MAX_AMOUNT_PER_TRANSFER}`,
        };
    }

    const totalAmount = currentUsed + amount;
    if (totalAmount > TRANSFER_LIMITS.MAX_WEEKLY_AMOUNT) {
        return {
            isValid: false,
            error: `This transfer exceeds the weekly limit of €${TRANSFER_LIMITS.MAX_WEEKLY_AMOUNT}`,
        };
    }

    return { isValid: true };
}

/**
 * Crea una nueva transferencia
 * Sanitiza automáticamente los datos y calcula la próxima fecha permitida
 * Invalida cachés relacionados
 */
export async function createTransfer(
    transferData: Omit<TransferInsert, 'next_allowed_date'>
): Promise<TransferServiceResult<Transfer>> {
    try {
        // Validar monto antes de crear
        if (transferData.amount && transferData.amount > TRANSFER_LIMITS.MAX_AMOUNT_PER_TRANSFER) {
            return {
                data: null,
                error: `Amount exceeds legal limit of €${TRANSFER_LIMITS.MAX_AMOUNT_PER_TRANSFER}`,
            };
        }

        // Sanitizar datos
        const sanitizedData = sanitizeObject(transferData);

        // Calcular próxima fecha permitida
        const nextAllowedDate = new Date();
        nextAllowedDate.setDate(nextAllowedDate.getDate() + TRANSFER_LIMITS.COOLDOWN_DAYS);

        const { data, error } = await supabase
            .from('transfers')
            .insert({
                ...sanitizedData,
                next_allowed_date: nextAllowedDate.toISOString(),
            } as TransferInsert)
            .select()
            .single();

        if (error) throw error;

        // Invalidar cachés relacionados
        if (data) {
            const businessId = (transferData as any).business_id;
            const clientId = (transferData as any).client_id;
            const docNumber = (transferData as any).document_number;

            if (businessId && docNumber && clientId) {
                cacheInvalidation.afterTransferCreated(businessId, docNumber, clientId);
            } else {
                // Invalidación parcial si no tenemos todos los datos
                if (businessId) cacheInvalidation.invalidateBusinessTransfers(businessId);
                if (docNumber) cacheInvalidation.invalidateEligibility(docNumber);
            }
        }

        return { data, error: null };
    } catch (err: any) {
        console.error('Error creating transfer:', err);
        return { data: null, error: err.message || 'Error creating transfer' };
    }
}

/**
 * Obtiene las transferencias de un negocio
 */
export async function getTransfersByBusiness(
    businessId: string,
    options?: {
        limit?: number;
        offset?: number;
        startDate?: string;
        endDate?: string;
    }
): Promise<TransferServiceResult<Transfer[]>> {
    try {
        let query = supabase
            .from('transfers')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        if (options?.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        if (options?.startDate) {
            query = query.gte('created_at', options.startDate);
        }

        if (options?.endDate) {
            query = query.lte('created_at', options.endDate);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { data: data || [], error: null };
    } catch (err: any) {
        console.error('Error loading transfers:', err);
        return { data: null, error: err.message || 'Error loading transfers' };
    }
}

/**
 * Obtiene las transferencias de un cliente específico
 */
export async function getTransfersByClient(
    clientId: string,
    options?: {
        limit?: number;
        businessId?: string;
    }
): Promise<TransferServiceResult<Transfer[]>> {
    try {
        let query = supabase
            .from('transfers')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (options?.businessId) {
            query = query.eq('business_id', options.businessId);
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { data: data || [], error: null };
    } catch (err: any) {
        console.error('Error loading client transfers:', err);
        return { data: null, error: err.message || 'Error loading client transfers' };
    }
}

/**
 * Obtiene una transferencia por ID
 */
export async function getTransferById(
    transferId: string
): Promise<TransferServiceResult<Transfer>> {
    try {
        const { data, error } = await supabase
            .from('transfers')
            .select('*')
            .eq('id', transferId)
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (err: any) {
        console.error('Error loading transfer:', err);
        return { data: null, error: err.message || 'Error loading transfer' };
    }
}

/**
 * Obtiene el resumen de transferencias de un cliente en los últimos 7 días
 */
export async function getWeeklySummary(
    documentNumber: string
): Promise<TransferServiceResult<{ total_amount: number; transfer_count: number }>> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('transfers')
            .select('amount')
            .eq('document_number', documentNumber)
            .gte('created_at', sevenDaysAgo.toISOString());

        if (error) throw error;

        const summary = {
            total_amount: data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
            transfer_count: data?.length || 0,
        };

        return { data: summary, error: null };
    } catch (err: any) {
        console.error('Error loading weekly summary:', err);
        return { data: null, error: err.message || 'Error loading weekly summary' };
    }
}

/**
 * Cancela una transferencia (si está permitido)
 */
export async function cancelTransfer(
    transferId: string,
    reason?: string
): Promise<TransferServiceResult<boolean>> {
    try {
        const { error } = await supabase
            .from('transfers')
            .update({
                status: 'cancelled',
                notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
            })
            .eq('id', transferId);

        if (error) throw error;

        return { data: true, error: null };
    } catch (err: any) {
        console.error('Error cancelling transfer:', err);
        return { data: false, error: err.message || 'Error cancelling transfer' };
    }
}

// Export default object for convenience
export const transferService = {
    checkEligibility: checkTransferEligibility,
    validateAmount: validateTransferAmount,
    create: createTransfer,
    getByBusiness: getTransfersByBusiness,
    getByClient: getTransfersByClient,
    getById: getTransferById,
    getWeeklySummary,
    cancel: cancelTransfer,
    LIMITS: TRANSFER_LIMITS,
};

export default transferService;
