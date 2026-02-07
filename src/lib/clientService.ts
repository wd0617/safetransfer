/**
 * Client Service
 * Capa de servicio para operaciones relacionadas con clientes
 * Separa la lógica de negocio de los componentes de UI
 */

import { supabase } from './supabase';
import { Database } from './database.types';
import { sanitizeObject } from './sanitize';
import { appCache, CACHE_KEYS, CACHE_TTL, cacheInvalidation } from './cache';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export interface SearchResult {
    id: string;
    full_name: string;
    document_type: string;
    document_number: string;
    document_country: string;
    date_of_birth: string;
    nationality: string | null;
    fiscal_code: string | null;
    phone: string | null;
    email: string | null;
}

export interface ClientServiceResult<T> {
    data: T | null;
    error: string | null;
}

/**
 * Busca un cliente existente por número de documento
 * Usa la función RPC para buscar en toda la base de datos
 */
export async function searchExistingClient(
    documentNumber: string
): Promise<ClientServiceResult<SearchResult[]>> {
    if (!documentNumber || documentNumber.length < 5) {
        return { data: null, error: 'Document number must be at least 5 characters' };
    }

    try {
        const { data, error } = await supabase.rpc('search_existing_client', {
            p_document_number: documentNumber,
        });

        if (error) {
            // Manejar caso especial de cliente ya existente
            if (error.message.includes('already exists in your business')) {
                return { data: null, error: 'CLIENT_ALREADY_EXISTS' };
            }
            throw error;
        }

        return { data: data || [], error: null };
    } catch (err: any) {
        console.error('Search error:', err);
        return { data: null, error: err.message || 'Error searching client' };
    }
}

/**
 * Obtiene todos los clientes de un negocio
 * Usa caché para mejorar rendimiento
 */
export async function getClientsByBusiness(
    businessId: string,
    options?: { skipCache?: boolean }
): Promise<ClientServiceResult<Client[]>> {
    const cacheKey = CACHE_KEYS.clientsByBusiness(businessId);

    // Verificar caché primero
    if (!options?.skipCache) {
        const cached = appCache.get<Client[]>(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }
    }

    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('business_id', businessId)
            .order('full_name');

        if (error) throw error;

        // Guardar en caché
        const clients = data || [];
        appCache.set(cacheKey, clients, CACHE_TTL.MEDIUM);

        return { data: clients, error: null };
    } catch (err: any) {
        console.error('Error loading clients:', err);
        return { data: null, error: err.message || 'Error loading clients' };
    }
}

/**
 * Obtiene un cliente por ID
 * Usa caché para mejorar rendimiento
 */
export async function getClientById(
    clientId: string,
    options?: { skipCache?: boolean }
): Promise<ClientServiceResult<Client>> {
    const cacheKey = CACHE_KEYS.clientById(clientId);

    // Verificar caché primero
    if (!options?.skipCache) {
        const cached = appCache.get<Client>(cacheKey);
        if (cached) {
            return { data: cached, error: null };
        }
    }

    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (error) throw error;

        // Guardar en caché
        if (data) {
            appCache.set(cacheKey, data, CACHE_TTL.MEDIUM);
        }

        return { data, error: null };
    } catch (err: any) {
        console.error('Error loading client:', err);
        return { data: null, error: err.message || 'Error loading client' };
    }
}

/**
 * Crea un nuevo cliente
 * Sanitiza automáticamente los datos antes de insertar
 * Invalida el caché del negocio
 */
export async function createClient(
    clientData: ClientInsert
): Promise<ClientServiceResult<Client>> {
    try {
        // Sanitizar datos antes de insertar
        const sanitizedData = sanitizeObject(clientData) as ClientInsert;

        const { data, error } = await supabase
            .from('clients')
            .insert(sanitizedData)
            .select()
            .single();

        if (error) throw error;

        // Invalidar caché del negocio
        if (data?.business_id) {
            cacheInvalidation.invalidateBusinessClients(data.business_id);
        }

        return { data, error: null };
    } catch (err: any) {
        console.error('Error creating client:', err);
        return { data: null, error: err.message || 'Error creating client' };
    }
}

/**
 * Actualiza un cliente existente
 * Sanitiza automáticamente los datos antes de actualizar
 * Invalida el caché del cliente y del negocio
 */
export async function updateClient(
    clientId: string,
    clientData: ClientUpdate
): Promise<ClientServiceResult<Client>> {
    try {
        // Sanitizar datos antes de actualizar
        const sanitizedData = sanitizeObject(clientData) as ClientUpdate;

        const { data, error } = await supabase
            .from('clients')
            .update(sanitizedData)
            .eq('id', clientId)
            .select()
            .single();

        if (error) throw error;

        // Invalidar caché
        if (data) {
            cacheInvalidation.afterClientModified(data.business_id, clientId);
        }

        return { data, error: null };
    } catch (err: any) {
        console.error('Error updating client:', err);
        return { data: null, error: err.message || 'Error updating client' };
    }
}

/**
 * Elimina un cliente (marca como inactivo o elimina)
 */
export async function deleteClient(
    clientId: string
): Promise<ClientServiceResult<boolean>> {
    try {
        const { error } = await supabase.from('clients').delete().eq('id', clientId);

        if (error) throw error;

        return { data: true, error: null };
    } catch (err: any) {
        console.error('Error deleting client:', err);
        return { data: false, error: err.message || 'Error deleting client' };
    }
}

/**
 * Busca clientes por nombre o documento (para autocompletado)
 */
export async function searchClients(
    businessId: string,
    searchTerm: string,
    limit: number = 10
): Promise<ClientServiceResult<Client[]>> {
    if (!searchTerm || searchTerm.length < 2) {
        return { data: [], error: null };
    }

    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('business_id', businessId)
            .or(`full_name.ilike.%${searchTerm}%,document_number.ilike.%${searchTerm}%`)
            .order('full_name')
            .limit(limit);

        if (error) throw error;

        return { data: data || [], error: null };
    } catch (err: any) {
        console.error('Error searching clients:', err);
        return { data: null, error: err.message || 'Error searching clients' };
    }
}

/**
 * Valida si un documento ya existe para un negocio
 */
export async function checkDocumentExists(
    businessId: string,
    documentNumber: string,
    excludeClientId?: string
): Promise<ClientServiceResult<boolean>> {
    try {
        let query = supabase
            .from('clients')
            .select('id')
            .eq('business_id', businessId)
            .eq('document_number', documentNumber);

        if (excludeClientId) {
            query = query.neq('id', excludeClientId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { data: (data?.length || 0) > 0, error: null };
    } catch (err: any) {
        console.error('Error checking document:', err);
        return { data: null, error: err.message || 'Error checking document' };
    }
}

// Export default object for convenience
export const clientService = {
    searchExisting: searchExistingClient,
    getByBusiness: getClientsByBusiness,
    getById: getClientById,
    create: createClient,
    update: updateClient,
    delete: deleteClient,
    search: searchClients,
    checkDocumentExists,
};

export default clientService;
