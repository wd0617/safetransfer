/**
 * Tests para el hook useFormValidation
 * Verifica la integración de validación y sanitización en formularios
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, useSanitize } from '../hooks/useFormValidation';

describe('useFormValidation', () => {

    // ============================================
    // Inicialización
    // ============================================
    describe('initialization', () => {
        it('initializes with empty errors', () => {
            const { result } = renderHook(() => useFormValidation());

            expect(result.current.errors).toEqual({});
            expect(result.current.isValid).toBe(true);
            expect(result.current.lastSecurityAlert).toBeNull();
        });

        it('accepts language option', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'it' }));

            expect(result.current).toBeDefined();
        });
    });

    // ============================================
    // sanitizeField
    // ============================================
    describe('sanitizeField', () => {
        it('sanitizes document_number field', () => {
            const { result } = renderHook(() => useFormValidation());

            const sanitized = result.current.sanitizeField('document_number', 'ab123456');
            expect(sanitized).toBe('AB123456');
        });

        it('sanitizes fiscal_code field', () => {
            const { result } = renderHook(() => useFormValidation());

            const sanitized = result.current.sanitizeField('fiscal_code', 'rssmra85m01h501k');
            expect(sanitized).toBe('RSSMRA85M01H501K');
        });

        it('sanitizes phone field', () => {
            const { result } = renderHook(() => useFormValidation());

            const sanitized = result.current.sanitizeField('phone', '+39 333abc123');
            expect(sanitized).toBe('+39 333123');
        });

        it('sanitizes email field', () => {
            const { result } = renderHook(() => useFormValidation());

            const sanitized = result.current.sanitizeField('email', 'USER@EXAMPLE.COM');
            expect(sanitized).toBe('user@example.com');
        });

        it('sanitizes name fields', () => {
            const { result } = renderHook(() => useFormValidation());

            const sanitized = result.current.sanitizeField('full_name', '  John   Doe  ');
            expect(sanitized).toBe('John Doe');
        });

        it('sanitizes generic fields with sanitizeInput', () => {
            const { result } = renderHook(() => useFormValidation());

            const sanitized = result.current.sanitizeField('notes', '<script>evil</script>Safe text');
            expect(sanitized).toBe('Safe text');
        });

        it('triggers security alert for dangerous patterns', () => {
            const onSecurityAlert = vi.fn();
            const { result } = renderHook(() =>
                useFormValidation({ onSecurityAlert })
            );

            act(() => {
                result.current.sanitizeField('notes', '<script>alert(1)</script>');
            });

            expect(onSecurityAlert).toHaveBeenCalledWith('notes', '<script>alert(1)</script>');
            expect(result.current.lastSecurityAlert).toContain('notes');
        });
    });

    // ============================================
    // validateField
    // ============================================
    describe('validateField', () => {
        it('validates document_number correctly', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            expect(result.current.validateField('document_number', 'AB123456')).toBeNull();
            expect(result.current.validateField('document_number', 'AB')).not.toBeNull();
        });

        it('validates email correctly', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            expect(result.current.validateField('email', 'valid@example.com')).toBeNull();
            expect(result.current.validateField('email', 'invalid')).not.toBeNull();
            expect(result.current.validateField('email', '')).toBeNull(); // optional
        });

        it('validates phone correctly', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            expect(result.current.validateField('phone', '+39 333 1234567')).toBeNull();
            expect(result.current.validateField('phone', '123')).not.toBeNull();
            expect(result.current.validateField('phone', '')).toBeNull(); // optional
        });

        it('validates amount correctly', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            expect(result.current.validateField('amount', 500)).toBeNull();
            expect(result.current.validateField('amount', 1000)).not.toBeNull();
        });

        it('validates full_name correctly', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            expect(result.current.validateField('full_name', 'John Doe')).toBeNull();
            expect(result.current.validateField('full_name', 'A')).not.toBeNull();
        });

        it('catches dangerous patterns in any field', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            const error = result.current.validateField('notes', '<script>evil()</script>');
            expect(error).not.toBeNull();
            expect(error).toContain('peligroso');
        });
    });

    // ============================================
    // validateClient
    // ============================================
    describe('validateClient', () => {
        it('validates complete valid client data', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            let validationResult: { isValid: boolean; errors: Record<string, string> };

            act(() => {
                validationResult = result.current.validateClient({
                    document_number: 'AB123456',
                    document_type: 'passport',
                    full_name: 'John Doe',
                    date_of_birth: '1990-01-01',
                    email: 'john@example.com',
                    phone: '+39 333 1234567',
                });
            });

            expect(validationResult!.isValid).toBe(true);
            expect(Object.keys(validationResult!.errors)).toHaveLength(0);
            expect(result.current.isValid).toBe(true);
        });

        it('catches validation errors and updates state', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            let validationResult: { isValid: boolean; errors: Record<string, string> };

            act(() => {
                validationResult = result.current.validateClient({
                    document_number: 'AB', // too short
                    document_type: 'passport',
                    full_name: 'A', // too short
                    date_of_birth: '1990-01-01',
                });
            });

            expect(validationResult!.isValid).toBe(false);
            expect(result.current.errors.document_number).toBeDefined();
            expect(result.current.errors.full_name).toBeDefined();
            expect(result.current.isValid).toBe(false);
        });
    });

    // ============================================
    // validateTransfer
    // ============================================
    describe('validateTransfer', () => {
        it('validates complete valid transfer data', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            let validationResult: { isValid: boolean; errors: Record<string, string> };

            act(() => {
                validationResult = result.current.validateTransfer({
                    amount: 500,
                    destination_country: 'IT',
                    recipient_name: 'Jane Doe',
                    transfer_system: 'western_union',
                });
            });

            expect(validationResult!.isValid).toBe(true);
            expect(Object.keys(validationResult!.errors)).toHaveLength(0);
        });

        it('rejects amounts over €999 limit', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            let validationResult: { isValid: boolean; errors: Record<string, string> };

            act(() => {
                validationResult = result.current.validateTransfer({
                    amount: 1500,
                    destination_country: 'IT',
                    recipient_name: 'Jane Doe',
                    transfer_system: 'western_union',
                });
            });

            expect(validationResult!.isValid).toBe(false);
            expect(validationResult!.errors.amount).toContain('€999');
        });
    });

    // ============================================
    // clearErrors & clearFieldError
    // ============================================
    describe('error management', () => {
        it('clears all errors', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            // First, create some errors
            act(() => {
                result.current.validateClient({
                    document_number: 'AB',
                    document_type: 'passport',
                    full_name: 'A',
                    date_of_birth: '1990-01-01',
                });
            });

            expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

            // Clear all
            act(() => {
                result.current.clearErrors();
            });

            expect(result.current.errors).toEqual({});
            expect(result.current.isValid).toBe(true);
        });

        it('clears specific field error', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            // First, create errors
            act(() => {
                result.current.validateClient({
                    document_number: 'AB',
                    document_type: 'passport',
                    full_name: 'A',
                    date_of_birth: '1990-01-01',
                });
            });

            // Clear only document_number
            act(() => {
                result.current.clearFieldError('document_number');
            });

            expect(result.current.errors.document_number).toBeUndefined();
            expect(result.current.errors.full_name).toBeDefined();
        });
    });

    // ============================================
    // hasError & getError
    // ============================================
    describe('error helpers', () => {
        it('hasError returns true for fields with errors', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            act(() => {
                result.current.validateClient({
                    document_number: 'AB',
                    document_type: 'passport',
                    full_name: 'John Doe',
                    date_of_birth: '1990-01-01',
                });
            });

            expect(result.current.hasError('document_number')).toBe(true);
            expect(result.current.hasError('full_name')).toBe(false);
        });

        it('getError returns error message for specific field', () => {
            const { result } = renderHook(() => useFormValidation({ language: 'es' }));

            act(() => {
                result.current.validateClient({
                    document_number: 'AB',
                    document_type: 'passport',
                    full_name: 'John Doe',
                    date_of_birth: '1990-01-01',
                });
            });

            expect(result.current.getError('document_number')).toBeDefined();
            expect(result.current.getError('email')).toBeUndefined();
        });
    });

    // ============================================
    // validators export
    // ============================================
    describe('validators export', () => {
        it('exports validators for direct use', () => {
            const { result } = renderHook(() => useFormValidation());

            expect(result.current.validators).toBeDefined();
            expect(result.current.validators.documentNumber).toBeInstanceOf(Function);
            expect(result.current.validators.email).toBeInstanceOf(Function);
        });
    });
});

// ============================================
// useSanitize
// ============================================
describe('useSanitize', () => {
    it('exports all sanitization functions', () => {
        const { result } = renderHook(() => useSanitize());

        expect(result.current.input).toBeInstanceOf(Function);
        expect(result.current.documentNumber).toBeInstanceOf(Function);
        expect(result.current.fiscalCode).toBeInstanceOf(Function);
        expect(result.current.phone).toBeInstanceOf(Function);
        expect(result.current.email).toBeInstanceOf(Function);
        expect(result.current.name).toBeInstanceOf(Function);
        expect(result.current.amount).toBeInstanceOf(Function);
        expect(result.current.containsDangerousPatterns).toBeInstanceOf(Function);
    });

    it('sanitizes input correctly', () => {
        const { result } = renderHook(() => useSanitize());

        // Script tags should be removed
        const sanitizedScript = result.current.input('<script>test</script>');
        expect(sanitizedScript).not.toContain('<script>');
        expect(sanitizedScript).not.toContain('</script>');

        expect(result.current.email('USER@EXAMPLE.COM')).toBe('user@example.com');
        expect(result.current.amount('500.50')).toBe(500.50);
    });
});
