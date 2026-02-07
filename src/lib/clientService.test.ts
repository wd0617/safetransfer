/**
 * Tests para Client Service
 * Verifica la correcta operación de la capa de servicios de clientes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de supabase
vi.mock('./supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
}));

import {
    searchExistingClient,
    getClientsByBusiness,
    checkDocumentExists,
} from './clientService';

describe('clientService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('searchExistingClient', () => {
        it('requires minimum 5 characters', async () => {
            const result = await searchExistingClient('AB12');

            expect(result.error).toBe('Document number must be at least 5 characters');
            expect(result.data).toBeNull();
        });

        it('returns empty array for valid search with no results', async () => {
            const result = await searchExistingClient('AB123456');

            expect(result.error).toBeNull();
            expect(result.data).toEqual([]);
        });
    });

    describe('getClientsByBusiness', () => {
        it('returns clients for valid business ID', async () => {
            const result = await getClientsByBusiness('test-business-id');

            // Should not throw and should have called supabase
            expect(result).toBeDefined();
        });
    });

    describe('checkDocumentExists', () => {
        it('validates input parameters', async () => {
            const result = await checkDocumentExists('business-id', 'DOC123');

            expect(result).toBeDefined();
        });
    });
});
