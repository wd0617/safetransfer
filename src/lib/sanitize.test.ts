/**
 * Tests para las utilidades de sanitización
 * Verifica la protección contra XSS, SQL injection y otros ataques
 */
import { describe, it, expect } from 'vitest';
import {
    escapeHtml,
    sanitizeInput,
    containsDangerousPatterns,
    sanitizeObject,
    sanitizeForQuery,
    sanitizeDocumentNumber,
    sanitizeFiscalCode,
    sanitizePhone,
    sanitizeEmail,
    sanitizeName,
    sanitizeAmount,
} from '../lib/sanitize';

describe('sanitize.ts', () => {

    // ============================================
    // escapeHtml
    // ============================================
    describe('escapeHtml', () => {
        it('escapes HTML special characters', () => {
            expect(escapeHtml('<script>alert("xss")</script>')).toBe(
                '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
            );
        });

        it('escapes ampersand', () => {
            expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
        });

        it('escapes single quotes', () => {
            expect(escapeHtml("O'Connor")).toBe("O&#039;Connor");
        });

        it('handles empty string', () => {
            expect(escapeHtml('')).toBe('');
        });

        it('handles null/undefined gracefully', () => {
            expect(escapeHtml(null as unknown as string)).toBe('');
            expect(escapeHtml(undefined as unknown as string)).toBe('');
        });

        it('handles non-string input', () => {
            expect(escapeHtml(123 as unknown as string)).toBe('');
        });
    });

    // ============================================
    // sanitizeInput
    // ============================================
    describe('sanitizeInput', () => {
        it('removes script tags', () => {
            expect(sanitizeInput('<script>alert("xss")</script>Normal text')).toBe('Normal text');
        });

        it('removes all HTML tags', () => {
            expect(sanitizeInput('<div><p>Hello</p></div>')).toBe('Hello');
        });

        it('removes event handlers', () => {
            expect(sanitizeInput('text onclick="evil()" more')).toBe('text more');
        });

        it('removes javascript: URLs', () => {
            expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
        });

        it('removes control characters', () => {
            const result = sanitizeInput('hello\x00world\x0Btest');
            expect(result).not.toContain('\x00');
            expect(result).not.toContain('\x0B');
        });

        it('normalizes whitespace', () => {
            expect(sanitizeInput('  too   many   spaces  ')).toBe('too many spaces');
        });

        it('handles empty input', () => {
            expect(sanitizeInput('')).toBe('');
        });

        it('preserves normal text', () => {
            expect(sanitizeInput('John Doe')).toBe('John Doe');
        });

        it('preserves accented characters', () => {
            expect(sanitizeInput('María José Gómez')).toBe('María José Gómez');
        });
    });

    // ============================================
    // containsDangerousPatterns
    // ============================================
    describe('containsDangerousPatterns', () => {
        describe('XSS patterns', () => {
            it('detects script tags', () => {
                expect(containsDangerousPatterns('<script>alert(1)</script>')).toBe(true);
            });

            it('detects javascript: URLs', () => {
                expect(containsDangerousPatterns('javascript:void(0)')).toBe(true);
            });

            it('detects event handlers', () => {
                expect(containsDangerousPatterns('onclick=evil()')).toBe(true);
                expect(containsDangerousPatterns('onload=malicious()')).toBe(true);
                expect(containsDangerousPatterns('onerror = bad()')).toBe(true);
            });

            it('detects data:text/html', () => {
                expect(containsDangerousPatterns('data: text/html,<script>')).toBe(true);
            });

            it('detects img onerror', () => {
                expect(containsDangerousPatterns('<img src=x onerror=alert(1)>')).toBe(true);
            });

            it('detects svg onload', () => {
                expect(containsDangerousPatterns('<svg onload=evil()>')).toBe(true);
            });

            it('detects iframe', () => {
                expect(containsDangerousPatterns('<iframe src="evil.com">')).toBe(true);
            });

            it('detects embed tags', () => {
                expect(containsDangerousPatterns('<embed src="evil.swf">')).toBe(true);
            });

            it('detects object tags', () => {
                expect(containsDangerousPatterns('<object data="evil.swf">')).toBe(true);
            });
        });

        describe('SQL injection patterns', () => {
            it('detects OR 1=1 attack', () => {
                expect(containsDangerousPatterns("' or '1'='1")).toBe(true);
            });

            it('detects DROP TABLE', () => {
                expect(containsDangerousPatterns('; DROP TABLE users--')).toBe(true);
            });

            it('detects DELETE FROM', () => {
                expect(containsDangerousPatterns('; DELETE FROM clients')).toBe(true);
            });

            it('detects UNION SELECT', () => {
                expect(containsDangerousPatterns('1 UNION SELECT * FROM passwords')).toBe(true);
            });

            it('detects SQL comments at end of line', () => {
                expect(containsDangerousPatterns('admin--')).toBe(true);
            });
        });

        describe('safe inputs', () => {
            it('allows normal text', () => {
                expect(containsDangerousPatterns('John Doe')).toBe(false);
            });

            it('allows normal email', () => {
                expect(containsDangerousPatterns('user@example.com')).toBe(false);
            });

            it('allows accented characters', () => {
                expect(containsDangerousPatterns('María José Ñoño')).toBe(false);
            });

            it('allows numbers', () => {
                expect(containsDangerousPatterns('12345')).toBe(false);
            });

            it('handles empty string', () => {
                expect(containsDangerousPatterns('')).toBe(false);
            });
        });
    });

    // ============================================
    // sanitizeObject
    // ============================================
    describe('sanitizeObject', () => {
        it('sanitizes all string properties', () => {
            const input = {
                name: '<script>evil()</script>John',
                age: 30,
                email: 'test@example.com',
            };
            const result = sanitizeObject(input);

            expect(result.name).toBe('John');
            expect(result.age).toBe(30);
            expect(result.email).toBe('test@example.com');
        });

        it('sanitizes nested objects', () => {
            const input = {
                user: {
                    name: '<script>bad</script>Jane',
                },
            };
            const result = sanitizeObject(input);

            expect(result.user.name).toBe('Jane');
        });

        it('sanitizes arrays of strings', () => {
            const input = {
                tags: ['<script>x</script>tag1', 'tag2'],
            };
            const result = sanitizeObject(input);

            expect(result.tags).toEqual(['tag1', 'tag2']);
        });

        it('preserves non-string values', () => {
            const input = {
                count: 42,
                active: true,
                nullValue: null,
            };
            const result = sanitizeObject(input);

            expect(result.count).toBe(42);
            expect(result.active).toBe(true);
            expect(result.nullValue).toBe(null);
        });

        it('handles null/undefined', () => {
            expect(sanitizeObject(null as unknown as Record<string, unknown>)).toBe(null);
            expect(sanitizeObject(undefined as unknown as Record<string, unknown>)).toBe(undefined);
        });
    });

    // ============================================
    // sanitizeForQuery
    // ============================================
    describe('sanitizeForQuery', () => {
        it('escapes single quotes', () => {
            expect(sanitizeForQuery("O'Brien")).toBe("O''Brien");
        });

        it('removes SQL comment dashes', () => {
            expect(sanitizeForQuery('admin--')).toBe('admin');
        });

        it('removes semicolons', () => {
            expect(sanitizeForQuery('value; DROP TABLE')).toBe('value DROP TABLE');
        });

        it('handles empty input', () => {
            expect(sanitizeForQuery('')).toBe('');
        });

        it('trims whitespace', () => {
            expect(sanitizeForQuery('  test  ')).toBe('test');
        });
    });

    // ============================================
    // sanitizeDocumentNumber
    // ============================================
    describe('sanitizeDocumentNumber', () => {
        it('converts to uppercase', () => {
            expect(sanitizeDocumentNumber('ab123456')).toBe('AB123456');
        });

        it('allows alphanumeric and hyphens', () => {
            expect(sanitizeDocumentNumber('AB-123-456')).toBe('AB-123-456');
        });

        it('removes special characters', () => {
            expect(sanitizeDocumentNumber("AB123'DELETE")).toBe('AB123DELETE');
        });

        it('limits length to 30 characters', () => {
            const longInput = 'A'.repeat(50);
            expect(sanitizeDocumentNumber(longInput).length).toBe(30);
        });

        it('handles empty input', () => {
            expect(sanitizeDocumentNumber('')).toBe('');
        });
    });

    // ============================================
    // sanitizeFiscalCode
    // ============================================
    describe('sanitizeFiscalCode', () => {
        it('converts to uppercase', () => {
            expect(sanitizeFiscalCode('rssmra85m01h501k')).toBe('RSSMRA85M01H501K');
        });

        it('removes non-alphanumeric characters', () => {
            expect(sanitizeFiscalCode('RSS-MRA-85M01H501K')).toBe('RSSMRA85M01H501K');
        });

        it('limits length to 16 characters', () => {
            const longInput = 'RSSMRA85M01H501KEXTRA';
            expect(sanitizeFiscalCode(longInput)).toBe('RSSMRA85M01H501K');
        });

        it('handles empty input', () => {
            expect(sanitizeFiscalCode('')).toBe('');
        });
    });

    // ============================================
    // sanitizePhone
    // ============================================
    describe('sanitizePhone', () => {
        it('allows international format', () => {
            expect(sanitizePhone('+39 06 1234567')).toBe('+39 06 1234567');
        });

        it('allows parentheses', () => {
            expect(sanitizePhone('(06) 12345678')).toBe('(06) 12345678');
        });

        it('removes letters and special chars', () => {
            expect(sanitizePhone('+39abc123')).toBe('+39123');
        });

        it('limits length to 25 characters', () => {
            const longPhone = '+39 333 123456789012345678901234567890';
            expect(sanitizePhone(longPhone).length).toBeLessThanOrEqual(25);
        });

        it('handles empty input', () => {
            expect(sanitizePhone('')).toBe('');
        });
    });

    // ============================================
    // sanitizeEmail
    // ============================================
    describe('sanitizeEmail', () => {
        it('converts to lowercase', () => {
            expect(sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
        });

        it('allows valid email characters', () => {
            expect(sanitizeEmail('user.name+tag@example.com')).toBe('user.name+tag@example.com');
        });

        it('removes invalid characters', () => {
            expect(sanitizeEmail('user<>@example.com')).toBe('user@example.com');
        });

        it('limits length to 100 characters', () => {
            const longEmail = 'a'.repeat(100) + '@example.com';
            expect(sanitizeEmail(longEmail).length).toBeLessThanOrEqual(100);
        });

        it('handles empty input', () => {
            expect(sanitizeEmail('')).toBe('');
        });
    });

    // ============================================
    // sanitizeName
    // ============================================
    describe('sanitizeName', () => {
        it('allows accented characters', () => {
            expect(sanitizeName('María José García-López')).toBe('María José García-López');
        });

        it('allows apostrophes', () => {
            expect(sanitizeName("O'Connor")).toBe("O'Connor");
        });

        it('removes numbers and special characters', () => {
            const result = sanitizeName('John123 Doe');
            expect(result).not.toContain('123');
        });

        it('normalizes whitespace', () => {
            expect(sanitizeName('  John   Doe  ')).toBe('John Doe');
        });

        it('limits length to 150 characters', () => {
            const longName = 'A'.repeat(200);
            expect(sanitizeName(longName).length).toBeLessThanOrEqual(150);
        });

        it('handles empty input', () => {
            expect(sanitizeName('')).toBe('');
        });
    });

    // ============================================
    // sanitizeAmount
    // ============================================
    describe('sanitizeAmount', () => {
        describe('with number input', () => {
            it('returns valid amounts unchanged', () => {
                expect(sanitizeAmount(500)).toBe(500);
            });

            it('limits to maximum 999', () => {
                expect(sanitizeAmount(1500)).toBe(999);
            });

            it('limits to minimum 0', () => {
                expect(sanitizeAmount(-100)).toBe(0);
            });

            it('rounds to 2 decimal places', () => {
                expect(sanitizeAmount(123.456)).toBe(123.46);
            });
        });

        describe('with string input', () => {
            it('parses valid numeric strings', () => {
                expect(sanitizeAmount('250.50')).toBe(250.50);
            });

            it('removes non-numeric characters', () => {
                expect(sanitizeAmount('€250.50')).toBe(250.50);
            });

            it('handles invalid strings', () => {
                expect(sanitizeAmount('not a number')).toBe(0);
            });

            it('limits to maximum 999', () => {
                expect(sanitizeAmount('1500')).toBe(999);
            });

            it('handles empty string', () => {
                expect(sanitizeAmount('')).toBe(0);
            });
        });
    });
});
