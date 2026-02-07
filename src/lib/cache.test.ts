/**
 * Tests para el Sistema de Caché
 * Verifica el funcionamiento correcto del caché en memoria
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { appCache, CACHE_KEYS, CACHE_TTL, cacheInvalidation } from './cache';

describe('Cache System', () => {
    beforeEach(() => {
        // Limpiar caché antes de cada test
        appCache.clear();
    });

    // ============================================
    // Basic Operations
    // ============================================
    describe('basic operations', () => {
        it('stores and retrieves values', () => {
            appCache.set('test-key', { name: 'test' });
            const result = appCache.get<{ name: string }>('test-key');

            expect(result).toEqual({ name: 'test' });
        });

        it('returns null for non-existent keys', () => {
            const result = appCache.get('non-existent');

            expect(result).toBeNull();
        });

        it('checks if key exists', () => {
            appCache.set('exists', 'value');

            expect(appCache.has('exists')).toBe(true);
            expect(appCache.has('not-exists')).toBe(false);
        });

        it('deletes values', () => {
            appCache.set('to-delete', 'value');
            expect(appCache.has('to-delete')).toBe(true);

            appCache.delete('to-delete');
            expect(appCache.has('to-delete')).toBe(false);
        });

        it('clears all values', () => {
            appCache.set('key1', 'value1');
            appCache.set('key2', 'value2');

            appCache.clear();

            expect(appCache.has('key1')).toBe(false);
            expect(appCache.has('key2')).toBe(false);
        });
    });

    // ============================================
    // TTL (Time To Live)
    // ============================================
    describe('TTL handling', () => {
        it('respects custom TTL', async () => {
            // Usar un TTL muy corto para el test
            appCache.set('short-ttl', 'value', 50); // 50ms

            expect(appCache.get('short-ttl')).toBe('value');

            // Esperar a que expire
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(appCache.get('short-ttl')).toBeNull();
        });

        it('uses default TTL when not specified', () => {
            appCache.set('default-ttl', 'value');

            // El valor debe existir inmediatamente
            expect(appCache.get('default-ttl')).toBe('value');
        });
    });

    // ============================================
    // Pattern Invalidation
    // ============================================
    describe('pattern invalidation', () => {
        it('invalidates by pattern prefix', () => {
            appCache.set('clients:business:1', 'client1');
            appCache.set('clients:business:2', 'client2');
            appCache.set('transfers:business:1', 'transfer1');

            const count = appCache.invalidateByPattern('clients:');

            expect(count).toBe(2);
            expect(appCache.has('clients:business:1')).toBe(false);
            expect(appCache.has('clients:business:2')).toBe(false);
            expect(appCache.has('transfers:business:1')).toBe(true);
        });

        it('invalidates specific business clients', () => {
            appCache.set('clients:business:abc:list', 'data1');
            appCache.set('clients:business:xyz:list', 'data2');

            appCache.invalidateByPattern('clients:business:abc');

            expect(appCache.has('clients:business:abc:list')).toBe(false);
            expect(appCache.has('clients:business:xyz:list')).toBe(true);
        });
    });

    // ============================================
    // Cache Keys
    // ============================================
    describe('CACHE_KEYS', () => {
        it('generates correct client keys', () => {
            expect(CACHE_KEYS.clientsByBusiness('biz123')).toBe('clients:business:biz123');
            expect(CACHE_KEYS.clientById('client456')).toBe('clients:id:client456');
        });

        it('generates correct transfer keys', () => {
            expect(CACHE_KEYS.transfersByBusiness('biz123')).toBe('transfers:business:biz123');
            expect(CACHE_KEYS.transfersByClient('client456')).toBe('transfers:client:client456');
        });

        it('generates correct eligibility keys', () => {
            expect(CACHE_KEYS.eligibility('DOC123', 'biz456')).toBe('eligibility:DOC123:biz456');
        });
    });

    // ============================================
    // Cache TTL Presets
    // ============================================
    describe('CACHE_TTL presets', () => {
        it('has correct short TTL (1 minute)', () => {
            expect(CACHE_TTL.SHORT).toBe(60 * 1000);
        });

        it('has correct medium TTL (5 minutes)', () => {
            expect(CACHE_TTL.MEDIUM).toBe(5 * 60 * 1000);
        });

        it('has correct long TTL (15 minutes)', () => {
            expect(CACHE_TTL.LONG).toBe(15 * 60 * 1000);
        });

        it('has correct eligibility TTL (30 seconds)', () => {
            expect(CACHE_TTL.ELIGIBILITY).toBe(30 * 1000);
        });
    });

    // ============================================
    // Cache Invalidation Helpers
    // ============================================
    describe('cacheInvalidation helpers', () => {
        it('invalidates business clients correctly', () => {
            appCache.set('clients:business:biz1:data', 'value');
            appCache.set('clients:search:biz1:term', 'value');

            cacheInvalidation.invalidateBusinessClients('biz1');

            expect(appCache.has('clients:business:biz1:data')).toBe(false);
            expect(appCache.has('clients:search:biz1:term')).toBe(false);
        });

        it('invalidates specific client correctly', () => {
            const key = CACHE_KEYS.clientById('client1');
            appCache.set(key, { name: 'Client 1' });

            cacheInvalidation.invalidateClient('client1');

            expect(appCache.has(key)).toBe(false);
        });

        it('invalidates eligibility correctly', () => {
            appCache.set('eligibility:DOC123:biz1', { can_transfer: true });
            appCache.set('eligibility:DOC123:biz2', { can_transfer: false });

            cacheInvalidation.invalidateEligibility('DOC123');

            expect(appCache.has('eligibility:DOC123:biz1')).toBe(false);
            expect(appCache.has('eligibility:DOC123:biz2')).toBe(false);
        });

        it('clears all cache on clearAll', () => {
            appCache.set('key1', 'value1');
            appCache.set('key2', 'value2');

            cacheInvalidation.clearAll();

            expect(appCache.getStats().size).toBe(0);
        });
    });

    // ============================================
    // Stats
    // ============================================
    describe('cache stats', () => {
        it('returns correct size', () => {
            appCache.set('key1', 'value1');
            appCache.set('key2', 'value2');

            const stats = appCache.getStats();

            expect(stats.size).toBe(2);
        });

        it('returns all keys', () => {
            appCache.set('key1', 'value1');
            appCache.set('key2', 'value2');

            const stats = appCache.getStats();

            expect(stats.keys).toContain('key1');
            expect(stats.keys).toContain('key2');
        });
    });

    // ============================================
    // getOrSet
    // ============================================
    describe('getOrSet', () => {
        it('returns cached value if exists', async () => {
            appCache.set('existing', 'cached-value');
            const fetchFn = vi.fn().mockResolvedValue('new-value');

            const result = await appCache.getOrSet('existing', fetchFn);

            expect(result).toBe('cached-value');
            expect(fetchFn).not.toHaveBeenCalled();
        });

        it('fetches and caches if not exists', async () => {
            const fetchFn = vi.fn().mockResolvedValue('fetched-value');

            const result = await appCache.getOrSet('new-key', fetchFn);

            expect(result).toBe('fetched-value');
            expect(fetchFn).toHaveBeenCalledOnce();
            expect(appCache.get('new-key')).toBe('fetched-value');
        });
    });
});
