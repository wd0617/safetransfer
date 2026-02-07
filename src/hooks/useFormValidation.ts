/**
 * Hook de React para validación de formularios con sanitización
 */

import { useState, useCallback } from 'react';
import {
    sanitizeInput,
    sanitizeDocumentNumber,
    sanitizeFiscalCode,
    sanitizePhone,
    sanitizeEmail,
    sanitizeName,
    sanitizeAmount,
    containsDangerousPatterns
} from '../lib/sanitize';
import {
    validators,
    validateWithMessage,
    validateClientForm,
    validateTransferForm
} from '../lib/validators';
import { Language } from '../lib/i18n';

interface UseFormValidationOptions {
    language?: Language;
    onSecurityAlert?: (field: string, value: string) => void;
}

interface FormValidationState {
    errors: Record<string, string>;
    isValid: boolean;
    lastSecurityAlert: string | null;
}

export function useFormValidation(options: UseFormValidationOptions = {}) {
    const { language = 'es', onSecurityAlert } = options;
    const [state, setState] = useState<FormValidationState>({
        errors: {},
        isValid: true,
        lastSecurityAlert: null,
    });

    /**
     * Sanitiza un valor según su tipo de campo
     */
    const sanitizeField = useCallback((fieldName: string, value: string): string => {
        // Verificar patrones peligrosos primero
        if (containsDangerousPatterns(value)) {
            onSecurityAlert?.(fieldName, value);
            setState((prev: FormValidationState) => ({
                ...prev,
                lastSecurityAlert: `Contenido peligroso detectado en ${fieldName}`,
            }));
        }

        // Aplicar sanitización específica según el campo
        switch (fieldName) {
            case 'document_number':
                return sanitizeDocumentNumber(value);
            case 'fiscal_code':
                return sanitizeFiscalCode(value);
            case 'phone':
                return sanitizePhone(value);
            case 'email':
                return sanitizeEmail(value);
            case 'full_name':
            case 'recipient_name':
                return sanitizeName(value);
            default:
                return sanitizeInput(value);
        }
    }, [onSecurityAlert]);

    /**
     * Valida un campo individual
     */
    const validateField = useCallback((fieldName: string, value: any): string | null => {
        const lang = language as 'es' | 'en' | 'it';

        switch (fieldName) {
            case 'document_number': {
                const result = validateWithMessage.documentNumber(value, lang);
                return result.error || null;
            }
            case 'email': {
                if (!value) return null; // Email es opcional
                const result = validateWithMessage.email(value, lang);
                return result.error || null;
            }
            case 'phone': {
                if (!value) return null; // Phone es opcional
                const result = validateWithMessage.phone(value, lang);
                return result.error || null;
            }
            case 'fiscal_code': {
                if (!value) return null; // Fiscal code es opcional
                const result = validateWithMessage.fiscalCode(value, lang);
                return result.error || null;
            }
            case 'amount': {
                const result = validateWithMessage.amount(value, lang);
                return result.error || null;
            }
            case 'full_name':
            case 'recipient_name': {
                const result = validateWithMessage.name(value, lang);
                return result.error || null;
            }
            case 'date_of_birth': {
                const result = validateWithMessage.dateOfBirth(value, lang);
                return result.error || null;
            }
            case 'document_expiry': {
                if (!value) return null;
                const result = validateWithMessage.documentExpiry(value, lang);
                return result.error || null;
            }
            case 'password': {
                const result = validateWithMessage.password(value, lang);
                return result.error || null;
            }
            default: {
                // Verificación de seguridad general
                if (typeof value === 'string' && containsDangerousPatterns(value)) {
                    const result = validateWithMessage.securityCheck(value, lang);
                    return result.error || null;
                }
                return null;
            }
        }
    }, [language]);

    /**
     * Valida y sanitiza un campo, actualizando el estado de errores
     */
    const handleFieldChange = useCallback((
        fieldName: string,
        value: any,
        setter: (value: any) => void
    ): void => {
        // Sanitizar si es string
        const sanitizedValue = typeof value === 'string'
            ? sanitizeField(fieldName, value)
            : value;

        // Actualizar el valor
        setter(sanitizedValue);

        // Validar el campo
        const error = validateField(fieldName, sanitizedValue);

        setState((prev: FormValidationState) => {
            const newErrors = { ...prev.errors };
            if (error) {
                newErrors[fieldName] = error;
            } else {
                delete newErrors[fieldName];
            }

            return {
                ...prev,
                errors: newErrors,
                isValid: Object.keys(newErrors).length === 0,
            };
        });
    }, [sanitizeField, validateField]);

    /**
     * Valida un formulario completo de cliente
     */
    const validateClient = useCallback((data: Record<string, any>) => {
        const lang = language as 'es' | 'en' | 'it';
        const result = validateClientForm(data, lang);

        setState((prev: FormValidationState) => ({
            ...prev,
            errors: result.errors,
            isValid: result.isValid,
        }));

        return result;
    }, [language]);

    /**
     * Valida un formulario completo de transferencia
     */
    const validateTransfer = useCallback((data: Record<string, any>) => {
        const lang = language as 'es' | 'en' | 'it';
        const result = validateTransferForm(data, lang);

        setState((prev: FormValidationState) => ({
            ...prev,
            errors: result.errors,
            isValid: result.isValid,
        }));

        return result;
    }, [language]);

    /**
     * Limpia todos los errores
     */
    const clearErrors = useCallback(() => {
        setState({
            errors: {},
            isValid: true,
            lastSecurityAlert: null,
        });
    }, []);

    /**
     * Limpia un error específico
     */
    const clearFieldError = useCallback((fieldName: string) => {
        setState((prev: FormValidationState) => {
            const newErrors = { ...prev.errors };
            delete newErrors[fieldName];
            return {
                ...prev,
                errors: newErrors,
                isValid: Object.keys(newErrors).length === 0,
            };
        });
    }, []);

    /**
     * Verifica si un campo tiene error
     */
    const hasError = useCallback((fieldName: string): boolean => {
        return !!state.errors[fieldName];
    }, [state.errors]);

    /**
     * Obtiene el mensaje de error de un campo
     */
    const getError = useCallback((fieldName: string): string | undefined => {
        return state.errors[fieldName];
    }, [state.errors]);

    return {
        // Estado
        errors: state.errors,
        isValid: state.isValid,
        lastSecurityAlert: state.lastSecurityAlert,

        // Funciones de sanitización
        sanitizeField,
        sanitizeAmount,

        // Funciones de validación
        validateField,
        validateClient,
        validateTransfer,
        handleFieldChange,

        // Utilidades
        clearErrors,
        clearFieldError,
        hasError,
        getError,

        // Validadores individuales exportados para uso directo
        validators,
    };
}

/**
 * Hook simplificado para sanitización rápida
 */
export function useSanitize() {
    return {
        input: sanitizeInput,
        documentNumber: sanitizeDocumentNumber,
        fiscalCode: sanitizeFiscalCode,
        phone: sanitizePhone,
        email: sanitizeEmail,
        name: sanitizeName,
        amount: sanitizeAmount,
        containsDangerousPatterns,
    };
}
