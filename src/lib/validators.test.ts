/**
 * Tests para las utilidades de validación
 * Verifica la correcta validación de inputs y protección contra inyecciones
 */
import { describe, it, expect } from 'vitest';
import {
    validators,
    validateWithMessage,
    validateClientForm,
    validateTransferForm,
} from '../lib/validators';

describe('validators.ts', () => {

    // ============================================
    // validators.documentNumber
    // ============================================
    describe('validators.documentNumber', () => {
        it('accepts valid document numbers', () => {
            expect(validators.documentNumber('AB123456')).toBe(true);
            expect(validators.documentNumber('AZ12345')).toBe(true);
            expect(validators.documentNumber('12345678')).toBe(true);
            expect(validators.documentNumber('AB-123-456')).toBe(true);
        });

        it('rejects too short document numbers', () => {
            expect(validators.documentNumber('AB12')).toBe(false);
        });

        it('rejects too long document numbers', () => {
            expect(validators.documentNumber('A'.repeat(31))).toBe(false);
        });

        it('rejects special characters (SQL injection attempts)', () => {
            expect(validators.documentNumber("'; DROP TABLE--")).toBe(false);
            expect(validators.documentNumber("AB123' OR '1'='1")).toBe(false);
        });

        it('rejects XSS attempts', () => {
            expect(validators.documentNumber('<script>alert(1)</script>')).toBe(false);
        });

        it('rejects empty string', () => {
            expect(validators.documentNumber('')).toBe(false);
        });

        it('rejects null/undefined', () => {
            expect(validators.documentNumber(null as unknown as string)).toBe(false);
            expect(validators.documentNumber(undefined as unknown as string)).toBe(false);
        });
    });

    // ============================================
    // validators.email
    // ============================================
    describe('validators.email', () => {
        it('accepts valid emails', () => {
            expect(validators.email('user@example.com')).toBe(true);
            expect(validators.email('user.name@example.co.uk')).toBe(true);
            expect(validators.email('user+tag@example.com')).toBe(true);
        });

        it('rejects invalid email formats', () => {
            expect(validators.email('notanemail')).toBe(false);
            expect(validators.email('@example.com')).toBe(false);
            expect(validators.email('user@')).toBe(false);
            expect(validators.email('user@.com')).toBe(false);
        });

        it('rejects XSS attempts in email', () => {
            expect(validators.email('<script>@example.com')).toBe(false);
        });

        it('handles empty string', () => {
            expect(validators.email('')).toBe(false);
        });
    });

    // ============================================
    // validators.phone
    // ============================================
    describe('validators.phone', () => {
        it('accepts valid phone formats', () => {
            expect(validators.phone('+39 06 12345678')).toBe(true);
            expect(validators.phone('+1-555-123-4567')).toBe(true);
            expect(validators.phone('(06) 12345678')).toBe(true);
            expect(validators.phone('333 1234567')).toBe(true);
        });

        it('rejects too short phone numbers', () => {
            expect(validators.phone('12345')).toBe(false);
        });

        it('rejects too long phone numbers', () => {
            expect(validators.phone('+39 06 12345678901234567890')).toBe(false);
        });

        it('rejects letters in phone', () => {
            expect(validators.phone('+39 ABC 123')).toBe(false);
        });

        it('handles empty string', () => {
            expect(validators.phone('')).toBe(false);
        });
    });

    // ============================================
    // validators.fiscalCode
    // ============================================
    describe('validators.fiscalCode', () => {
        it('accepts valid Italian fiscal codes', () => {
            expect(validators.fiscalCode('RSSMRA85M01H501K')).toBe(true);
            expect(validators.fiscalCode('rssmra85m01h501k')).toBe(true); // case insensitive
        });

        it('rejects invalid formats', () => {
            expect(validators.fiscalCode('1234567890123456')).toBe(false);
            expect(validators.fiscalCode('RSSMRA85M01H50')).toBe(false); // too short
            expect(validators.fiscalCode('RSSMRA85M01H501KK')).toBe(false); // too long
        });

        it('rejects injection attempts', () => {
            expect(validators.fiscalCode("RSSMRA85M01H50'; DROP")).toBe(false);
        });

        it('handles empty string', () => {
            expect(validators.fiscalCode('')).toBe(false);
        });
    });

    // ============================================
    // validators.amount
    // ============================================
    describe('validators.amount', () => {
        it('accepts valid amounts within limit', () => {
            expect(validators.amount(500)).toBe(true);
            expect(validators.amount(999)).toBe(true);
            expect(validators.amount(0.01)).toBe(true);
        });

        it('rejects zero', () => {
            expect(validators.amount(0)).toBe(false);
        });

        it('rejects negative amounts', () => {
            expect(validators.amount(-100)).toBe(false);
        });

        it('rejects amounts over 999 (Italian regulation)', () => {
            expect(validators.amount(1000)).toBe(false);
            expect(validators.amount(999.01)).toBe(false);
        });

        it('rejects non-finite numbers', () => {
            expect(validators.amount(Infinity)).toBe(false);
            expect(validators.amount(NaN)).toBe(false);
        });
    });

    // ============================================
    // validators.name
    // ============================================
    describe('validators.name', () => {
        it('accepts valid names', () => {
            expect(validators.name('John Doe')).toBe(true);
            expect(validators.name('María José García-López')).toBe(true);
            expect(validators.name("O'Connor")).toBe(true);
        });

        it('rejects names that are too short', () => {
            expect(validators.name('A')).toBe(false);
        });

        it('rejects names that are too long', () => {
            expect(validators.name('A'.repeat(151))).toBe(false);
        });

        it('rejects names with numbers', () => {
            expect(validators.name('John123')).toBe(false);
        });

        it('rejects XSS attempts', () => {
            expect(validators.name('<script>alert(1)</script>')).toBe(false);
        });

        it('handles empty string', () => {
            expect(validators.name('')).toBe(false);
        });
    });

    // ============================================
    // validators.countryCode
    // ============================================
    describe('validators.countryCode', () => {
        it('accepts valid ISO country codes', () => {
            expect(validators.countryCode('IT')).toBe(true);
            expect(validators.countryCode('ES')).toBe(true);
        });

        it('rejects invalid formats', () => {
            expect(validators.countryCode('I')).toBe(false);
            expect(validators.countryCode('ITALY')).toBe(false);
            expect(validators.countryCode('12')).toBe(false);
        });

        it('handles empty string', () => {
            expect(validators.countryCode('')).toBe(false);
        });
    });

    // ============================================
    // validators.dateOfBirth
    // ============================================
    describe('validators.dateOfBirth', () => {
        it('accepts valid dates (18+ years old)', () => {
            expect(validators.dateOfBirth('1990-01-15')).toBe(true);
            expect(validators.dateOfBirth('1985-12-31')).toBe(true);
        });

        it('rejects future dates', () => {
            expect(validators.dateOfBirth('2099-01-01')).toBe(false);
        });

        it('rejects dates less than 18 years ago', () => {
            const recentDate = new Date();
            recentDate.setFullYear(recentDate.getFullYear() - 10);
            expect(validators.dateOfBirth(recentDate.toISOString().split('T')[0])).toBe(false);
        });

        it('rejects dates more than 120 years ago', () => {
            expect(validators.dateOfBirth('1880-01-01')).toBe(false);
        });

        it('rejects invalid date formats', () => {
            expect(validators.dateOfBirth('not-a-date')).toBe(false);
        });

        it('handles empty string', () => {
            expect(validators.dateOfBirth('')).toBe(false);
        });
    });

    // ============================================
    // validators.password
    // ============================================
    describe('validators.password', () => {
        it('accepts strong passwords', () => {
            expect(validators.password('MySecure123')).toBe(true);
            expect(validators.password('Password1')).toBe(true);
        });

        it('rejects passwords without uppercase', () => {
            expect(validators.password('mysecure123')).toBe(false);
        });

        it('rejects passwords without lowercase', () => {
            expect(validators.password('MYSECURE123')).toBe(false);
        });

        it('rejects passwords without numbers', () => {
            expect(validators.password('MySecure!@#$')).toBe(false);
        });

        it('rejects passwords that are too short', () => {
            expect(validators.password('My1')).toBe(false);
        });

        it('handles empty string', () => {
            expect(validators.password('')).toBe(false);
        });
    });

    // ============================================
    // validators.securityCheck (via safeText)
    // ============================================
    describe('validators.safeText (securityCheck)', () => {
        it('rejects XSS patterns', () => {
            expect(validators.safeText('<script>alert(1)</script>')).toBe(false);
            expect(validators.safeText('onclick="evil()"')).toBe(false);
        });

        it('rejects SQL injection patterns', () => {
            expect(validators.safeText("'; DROP TABLE users--")).toBe(false);
            expect(validators.safeText("1' OR '1'='1")).toBe(false);
        });

        it('allows normal text', () => {
            expect(validators.safeText('Hello, World!')).toBe(true);
            expect(validators.safeText('María José')).toBe(true);
        });

        it('handles empty string', () => {
            expect(validators.safeText('')).toBe(false); // safeText requires non-empty
        });
    });

    // ============================================
    // validateWithMessage
    // ============================================
    describe('validateWithMessage', () => {
        describe('documentNumber', () => {
            it('returns valid result for valid input', () => {
                const result = validateWithMessage.documentNumber('AB123456', 'es');
                expect(result.isValid).toBe(true);
                expect(result.error).toBeUndefined();
            });

            it('returns error for invalid input in Spanish', () => {
                const result = validateWithMessage.documentNumber('AB', 'es');
                expect(result.isValid).toBe(false);
                expect(result.error).toContain('5-30 caracteres alfanuméricos');
            });

            it('returns error for invalid input in English', () => {
                const result = validateWithMessage.documentNumber('AB', 'en');
                expect(result.isValid).toBe(false);
                expect(result.error).toContain('5-30 alphanumeric characters');
            });

            it('returns error for invalid input in Italian', () => {
                const result = validateWithMessage.documentNumber('AB', 'it');
                expect(result.isValid).toBe(false);
                expect(result.error).toContain('5-30 caratteri alfanumerici');
            });
        });

        describe('amount', () => {
            it('returns error for amounts over legal limit', () => {
                const result = validateWithMessage.amount(1000, 'es');
                expect(result.isValid).toBe(false);
                expect(result.error).toContain('€999');
            });
        });

        describe('securityCheck', () => {
            it('returns error for dangerous patterns', () => {
                const result = validateWithMessage.securityCheck('<script>', 'es');
                expect(result.isValid).toBe(false);
                expect(result.error).toContain('peligroso');
            });
        });
    });

    // ============================================
    // validateClientForm
    // ============================================
    describe('validateClientForm', () => {
        it('validates complete valid client data', () => {
            const data = {
                document_number: 'AB123456',
                document_type: 'passport',
                full_name: 'John Doe',
                date_of_birth: '1990-01-01',
                email: 'john@example.com',
                phone: '+39 333 1234567',
            };
            const result = validateClientForm(data, 'es');
            expect(result.isValid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });

        it('catches invalid document number', () => {
            const data = {
                document_number: 'AB',
                document_type: 'passport',
                full_name: 'John Doe',
                date_of_birth: '1990-01-01',
            };
            const result = validateClientForm(data, 'es');
            expect(result.isValid).toBe(false);
            expect(result.errors.document_number).toBeDefined();
        });

        it('catches XSS in name field', () => {
            const data = {
                document_number: 'AB123456',
                document_type: 'passport',
                full_name: '<script>alert(1)</script>',
                date_of_birth: '1990-01-01',
            };
            const result = validateClientForm(data, 'es');
            expect(result.isValid).toBe(false);
            expect(result.errors.full_name).toBeDefined();
        });

        it('catches invalid email format', () => {
            const data = {
                document_number: 'AB123456',
                document_type: 'passport',
                full_name: 'John Doe',
                date_of_birth: '1990-01-01',
                email: 'invalid-email',
            };
            const result = validateClientForm(data, 'es');
            expect(result.isValid).toBe(false);
            expect(result.errors.email).toBeDefined();
        });

        it('allows optional fields to be empty', () => {
            const data = {
                document_number: 'AB123456',
                document_type: 'passport',
                full_name: 'John Doe',
                date_of_birth: '1990-01-01',
                email: '', // optional - empty is OK
                phone: '', // optional - empty is OK
            };
            const result = validateClientForm(data, 'es');
            expect(result.isValid).toBe(true);
        });
    });

    // ============================================
    // validateTransferForm
    // ============================================
    describe('validateTransferForm', () => {
        it('validates complete valid transfer data', () => {
            const data = {
                amount: 500,
                destination_country: 'IT',
                recipient_name: 'Jane Doe',
                transfer_system: 'western_union',
            };
            const result = validateTransferForm(data, 'es');
            expect(result.isValid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });

        it('catches amount over legal limit', () => {
            const data = {
                amount: 1500,
                destination_country: 'IT',
                recipient_name: 'Jane Doe',
                transfer_system: 'western_union',
            };
            const result = validateTransferForm(data, 'es');
            expect(result.isValid).toBe(false);
            expect(result.errors.amount).toContain('€999');
        });

        it('catches zero amount', () => {
            const data = {
                amount: 0,
                destination_country: 'IT',
                recipient_name: 'Jane Doe',
                transfer_system: 'western_union',
            };
            const result = validateTransferForm(data, 'es');
            expect(result.isValid).toBe(false);
            expect(result.errors.amount).toBeDefined();
        });

        it('catches missing country', () => {
            const data = {
                amount: 500,
                destination_country: '', // missing
                recipient_name: 'Jane Doe',
                transfer_system: 'western_union',
            };
            const result = validateTransferForm(data, 'es');
            expect(result.isValid).toBe(false);
            expect(result.errors.destination_country).toBeDefined();
        });

        it('catches XSS in recipient name', () => {
            const data = {
                amount: 500,
                destination_country: 'IT',
                recipient_name: '<script>evil()</script>',
                transfer_system: 'western_union',
            };
            const result = validateTransferForm(data, 'es');
            expect(result.isValid).toBe(false);
            expect(result.errors.recipient_name).toBeDefined();
        });
    });
});
