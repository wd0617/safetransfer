/**
 * Sistema de validación de inputs para SafeTransfer
 * Incluye validadores para todos los tipos de datos del sistema
 */

import { containsDangerousPatterns } from './sanitize';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validadores individuales - retornan true si el valor es válido
 */
export const validators = {
    /**
     * Valida número de documento (5-30 caracteres alfanuméricos)
     */
    documentNumber: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        if (containsDangerousPatterns(value)) return false;
        return /^[A-Z0-9\-]{5,30}$/i.test(value);
    },

    /**
     * Valida email según RFC 5322 simplificado
     */
    email: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        if (containsDangerousPatterns(value)) return false;
        return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value);
    },

    /**
     * Valida teléfono internacional (8-25 caracteres)
     */
    phone: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        if (containsDangerousPatterns(value)) return false;
        return /^\+?[0-9\s\-()]{8,25}$/.test(value);
    },

    /**
     * Valida código fiscal italiano (16 caracteres)
     */
    fiscalCode: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        if (containsDangerousPatterns(value)) return false;
        // Formato: 6 letras + 2 números + 1 letra + 2 números + 1 letra + 3 números + 1 letra
        return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i.test(value);
    },

    /**
     * Valida monto de transferencia (0 < amount <= 999)
     */
    amount: (value: number): boolean => {
        if (typeof value !== 'number' || isNaN(value)) return false;
        return value > 0 && value <= 999 && Number.isFinite(value);
    },

    /**
     * Valida nombre de persona/negocio (2-150 caracteres)
     */
    name: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        if (containsDangerousPatterns(value)) return false;
        // Permite letras (con acentos), espacios, guiones, apóstrofes
        return /^[a-zA-ZÀ-ÿ\s\-'.]{2,150}$/.test(value);
    },

    /**
     * Valida código de país (2 letras ISO)
     */
    countryCode: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        return /^[A-Z]{2}$/i.test(value);
    },

    /**
     * Valida código postal (3-10 caracteres alfanuméricos)
     */
    postalCode: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        if (containsDangerousPatterns(value)) return false;
        return /^[A-Z0-9\s\-]{3,10}$/i.test(value);
    },

    /**
     * Valida fecha en formato YYYY-MM-DD
     */
    date: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(value);
        return !isNaN(date.getTime());
    },

    /**
     * Valida que la fecha no haya expirado
     */
    notExpired: (value: string): boolean => {
        if (!validators.date(value)) return false;
        const expiry = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expiry >= today;
    },

    /**
     * Valida fecha de nacimiento (debe ser mayor de 18 años y menor de 120)
     */
    dateOfBirth: (value: string): boolean => {
        if (!validators.date(value)) return false;
        const birth = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birth.getFullYear();
        return age >= 18 && age <= 120;
    },

    /**
     * Valida texto general sin patrones peligrosos
     */
    safeText: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        return !containsDangerousPatterns(value);
    },

    /**
     * Valida contraseña segura (mínimo 8 caracteres, una mayúscula, minúscula y número)
     */
    password: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        if (value.length < 8) return false;
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
    },

    /**
     * Valida tipo de documento
     */
    documentType: (value: string): boolean => {
        const validTypes = ['passport', 'id_card', 'residence_permit', 'drivers_license'];
        return validTypes.includes(value);
    },

    /**
     * Valida sistema de transferencia
     */
    transferSystem: (value: string): boolean => {
        const validSystems = [
            'western_union',
            'ria',
            'moneygram',
            'monty',
            'mondial_bony',
            'itransfer',
        ];
        return validSystems.includes(value);
    },

    /**
     * Valida UUID v4
     */
    uuid: (value: string): boolean => {
        if (!value || typeof value !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    },
};

/**
 * Validadores con mensajes de error
 */
export const validateWithMessage = {
    documentNumber: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'Número de documento inválido. Debe contener 5-30 caracteres alfanuméricos.',
            en: 'Invalid document number. Must contain 5-30 alphanumeric characters.',
            it: 'Numero di documento non valido. Deve contenere 5-30 caratteri alfanumerici.',
        };
        return {
            isValid: validators.documentNumber(value),
            error: !validators.documentNumber(value) ? messages[lang] : undefined,
        };
    },

    email: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'Email inválido. Por favor, ingresa un email válido.',
            en: 'Invalid email. Please enter a valid email address.',
            it: 'Email non valida. Inserisci un indirizzo email valido.',
        };
        return {
            isValid: validators.email(value),
            error: !validators.email(value) ? messages[lang] : undefined,
        };
    },

    phone: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'Teléfono inválido. Debe contener 8-25 dígitos.',
            en: 'Invalid phone number. Must contain 8-25 digits.',
            it: 'Numero di telefono non valido. Deve contenere 8-25 cifre.',
        };
        return {
            isValid: validators.phone(value),
            error: !validators.phone(value) ? messages[lang] : undefined,
        };
    },

    fiscalCode: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'Código fiscal inválido. Debe tener el formato italiano correcto.',
            en: 'Invalid fiscal code. Must have the correct Italian format.',
            it: 'Codice fiscale non valido. Deve avere il formato italiano corretto.',
        };
        return {
            isValid: validators.fiscalCode(value),
            error: !validators.fiscalCode(value) ? messages[lang] : undefined,
        };
    },

    amount: (value: number, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'Monto inválido. Debe ser mayor a 0 y no exceder €999.',
            en: 'Invalid amount. Must be greater than 0 and not exceed €999.',
            it: 'Importo non valido. Deve essere maggiore di 0 e non superare €999.',
        };
        return {
            isValid: validators.amount(value),
            error: !validators.amount(value) ? messages[lang] : undefined,
        };
    },

    name: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'Nombre inválido. Debe contener 2-150 caracteres.',
            en: 'Invalid name. Must contain 2-150 characters.',
            it: 'Nome non valido. Deve contenere 2-150 caratteri.',
        };
        return {
            isValid: validators.name(value),
            error: !validators.name(value) ? messages[lang] : undefined,
        };
    },

    dateOfBirth: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'Fecha de nacimiento inválida. El cliente debe ser mayor de 18 años.',
            en: 'Invalid date of birth. Client must be at least 18 years old.',
            it: 'Data di nascita non valida. Il cliente deve avere almeno 18 anni.',
        };
        return {
            isValid: validators.dateOfBirth(value),
            error: !validators.dateOfBirth(value) ? messages[lang] : undefined,
        };
    },

    documentExpiry: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'El documento ha expirado o la fecha es inválida.',
            en: 'The document has expired or the date is invalid.',
            it: 'Il documento è scaduto o la data non è valida.',
        };
        return {
            isValid: validators.notExpired(value),
            error: !validators.notExpired(value) ? messages[lang] : undefined,
        };
    },

    password: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const messages = {
            es: 'Contraseña inválida. Debe tener al menos 8 caracteres, una mayúscula, minúscula y número.',
            en: 'Invalid password. Must have at least 8 characters, one uppercase, lowercase and number.',
            it: 'Password non valida. Deve avere almeno 8 caratteri, una maiuscola, minuscola e numero.',
        };
        return {
            isValid: validators.password(value),
            error: !validators.password(value) ? messages[lang] : undefined,
        };
    },

    securityCheck: (value: string, lang: 'es' | 'en' | 'it' = 'es'): ValidationResult => {
        const hasDangerousPatterns = containsDangerousPatterns(value);
        const messages = {
            es: 'Se detectó contenido potencialmente peligroso. Por favor, elimina caracteres especiales.',
            en: 'Potentially dangerous content detected. Please remove special characters.',
            it: 'Rilevato contenuto potenzialmente pericoloso. Rimuovi i caratteri speciali.',
        };
        return {
            isValid: !hasDangerousPatterns,
            error: hasDangerousPatterns ? messages[lang] : undefined,
        };
    },
};

/**
 * Valida un formulario completo de cliente
 */
export function validateClientForm(
    data: Record<string, any>,
    lang: 'es' | 'en' | 'it' = 'es'
): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Validar nombre
    if (!data.full_name || !validators.name(data.full_name)) {
        const result = validateWithMessage.name(data.full_name || '', lang);
        if (result.error) errors.full_name = result.error;
    }

    // Validar tipo de documento
    if (!validators.documentType(data.document_type)) {
        errors.document_type = {
            es: 'Tipo de documento inválido.',
            en: 'Invalid document type.',
            it: 'Tipo di documento non valido.',
        }[lang];
    }

    // Validar número de documento
    if (!data.document_number || !validators.documentNumber(data.document_number)) {
        const result = validateWithMessage.documentNumber(data.document_number || '', lang);
        if (result.error) errors.document_number = result.error;
    }

    // Validar fecha de nacimiento
    if (!data.date_of_birth || !validators.dateOfBirth(data.date_of_birth)) {
        const result = validateWithMessage.dateOfBirth(data.date_of_birth || '', lang);
        if (result.error) errors.date_of_birth = result.error;
    }

    // Validar expiración del documento (si se proporciona)
    if (data.document_expiry && !validators.notExpired(data.document_expiry)) {
        const result = validateWithMessage.documentExpiry(data.document_expiry, lang);
        if (result.error) errors.document_expiry = result.error;
    }

    // Validar email (si se proporciona)
    if (data.email && !validators.email(data.email)) {
        const result = validateWithMessage.email(data.email, lang);
        if (result.error) errors.email = result.error;
    }

    // Validar teléfono (si se proporciona)
    if (data.phone && !validators.phone(data.phone)) {
        const result = validateWithMessage.phone(data.phone, lang);
        if (result.error) errors.phone = result.error;
    }

    // Validar código fiscal (si se proporciona)
    if (data.fiscal_code && !validators.fiscalCode(data.fiscal_code)) {
        const result = validateWithMessage.fiscalCode(data.fiscal_code, lang);
        if (result.error) errors.fiscal_code = result.error;
    }

    // Verificación de seguridad general
    const fieldsToCheck = ['full_name', 'address', 'city', 'notes'];
    for (const field of fieldsToCheck) {
        if (data[field] && containsDangerousPatterns(data[field])) {
            const result = validateWithMessage.securityCheck(data[field], lang);
            if (result.error) errors[field] = result.error;
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Valida un formulario completo de transferencia
 */
export function validateTransferForm(
    data: Record<string, any>,
    lang: 'es' | 'en' | 'it' = 'es'
): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Validar monto
    if (!data.amount || !validators.amount(data.amount)) {
        const result = validateWithMessage.amount(data.amount || 0, lang);
        if (result.error) errors.amount = result.error;
    }

    // Validar nombre del destinatario
    if (!data.recipient_name || !validators.name(data.recipient_name)) {
        const result = validateWithMessage.name(data.recipient_name || '', lang);
        if (result.error) errors.recipient_name = result.error;
    }

    // Validar sistema de transferencia
    if (!validators.transferSystem(data.transfer_system)) {
        errors.transfer_system = {
            es: 'Selecciona un sistema de transferencia válido.',
            en: 'Please select a valid transfer system.',
            it: 'Seleziona un sistema di trasferimento valido.',
        }[lang];
    }

    // Validar país de destino
    if (!data.destination_country) {
        errors.destination_country = {
            es: 'Selecciona un país de destino.',
            en: 'Please select a destination country.',
            it: 'Seleziona un paese di destinazione.',
        }[lang];
    }

    // Verificación de seguridad general
    const fieldsToCheck = ['recipient_name', 'recipient_relationship', 'purpose', 'notes'];
    for (const field of fieldsToCheck) {
        if (data[field] && containsDangerousPatterns(data[field])) {
            const result = validateWithMessage.securityCheck(data[field], lang);
            if (result.error) errors[field] = result.error;
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}
