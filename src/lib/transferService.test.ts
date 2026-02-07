/**
 * Tests para Transfer Service
 * Verifica la correcta operación de la capa de servicios de transferencias
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateTransferAmount, TRANSFER_LIMITS } from './transferService';

// Mock de supabase
vi.mock('./supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
}));

describe('transferService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================
    // TRANSFER_LIMITS
    // ============================================
    describe('TRANSFER_LIMITS', () => {
        it('defines maximum amount per transfer as 999', () => {
            expect(TRANSFER_LIMITS.MAX_AMOUNT_PER_TRANSFER).toBe(999);
        });

        it('defines maximum weekly amount as 999', () => {
            expect(TRANSFER_LIMITS.MAX_WEEKLY_AMOUNT).toBe(999);
        });

        it('defines cooldown period as 8 days', () => {
            expect(TRANSFER_LIMITS.COOLDOWN_DAYS).toBe(8);
        });
    });

    // ============================================
    // validateTransferAmount
    // ============================================
    describe('validateTransferAmount', () => {
        it('accepts valid amounts within limits', () => {
            const result = validateTransferAmount(500, 0);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('rejects zero amount', () => {
            const result = validateTransferAmount(0, 0);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('greater than 0');
        });

        it('rejects negative amount', () => {
            const result = validateTransferAmount(-100, 0);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('greater than 0');
        });

        it('rejects amount exceeding €999 per transfer', () => {
            const result = validateTransferAmount(1000, 0);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('999');
        });

        it('rejects amount that would exceed weekly limit', () => {
            const result = validateTransferAmount(500, 600);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('weekly limit');
        });

        it('accepts amount at exactly €999 when no prior transfers', () => {
            const result = validateTransferAmount(999, 0);

            expect(result.isValid).toBe(true);
        });

        it('accepts amount that reaches but does not exceed weekly limit', () => {
            const result = validateTransferAmount(499, 500);

            expect(result.isValid).toBe(true);
        });

        it('rejects even €1 when weekly limit is reached', () => {
            const result = validateTransferAmount(1, 999);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('weekly limit');
        });
    });

    // ============================================
    // Edge cases
    // ============================================
    describe('edge cases', () => {
        it('handles decimal amounts correctly', () => {
            const result = validateTransferAmount(999.99, 0);

            // 999.99 > 999, should be invalid
            expect(result.isValid).toBe(false);
        });

        it('handles very small amounts', () => {
            const result = validateTransferAmount(0.01, 0);

            expect(result.isValid).toBe(true);
        });

        it('calculates remaining availability correctly', () => {
            // Used 500, can transfer up to 499 more
            const result1 = validateTransferAmount(499, 500);
            expect(result1.isValid).toBe(true);

            const result2 = validateTransferAmount(500, 500);
            expect(result2.isValid).toBe(false);
        });
    });
});
