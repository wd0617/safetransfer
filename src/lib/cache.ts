/**
 * Cache System
 * Sistema de caché en memoria con TTL (Time To Live)
 * Mejora el rendimiento evitando llamadas repetidas a la base de datos
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // milliseconds
}

interface CacheOptions {
    ttl?: number; // Default TTL in milliseconds
    maxSize?: number; // Maximum number of entries
    onEvict?: (key: string, value: unknown) => void;
}

// TTL por defecto: 5 minutos
const DEFAULT_TTL = 5 * 60 * 1000;
const DEFAULT_MAX_SIZE = 100;

class CacheStore {
    private cache: Map<string, CacheEntry<unknown>> = new Map();
    private options: Required<CacheOptions>;

    constructor(options: CacheOptions = {}) {
        this.options = {
            ttl: options.ttl ?? DEFAULT_TTL,
            maxSize: options.maxSize ?? DEFAULT_MAX_SIZE,
            onEvict: options.onEvict ?? (() => { }),
        };

        // Limpiar entries expirados periódicamente
        this.startCleanupInterval();
    }

    /**
     * Obtener un valor del caché
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Verificar si ha expirado
        if (this.isExpired(entry)) {
            this.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Guardar un valor en el caché
     */
    set<T>(key: string, data: T, ttl?: number): void {
        // Si el caché está lleno, eliminar el entry más antiguo
        if (this.cache.size >= this.options.maxSize) {
            this.evictOldest();
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl ?? this.options.ttl,
        });
    }

    /**
     * Verificar si una clave existe y no ha expirado
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (this.isExpired(entry)) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Eliminar una entrada del caché
     */
    delete(key: string): boolean {
        const entry = this.cache.get(key);
        if (entry) {
            this.options.onEvict(key, entry.data);
        }
        return this.cache.delete(key);
    }

    /**
     * Limpiar todo el caché
     */
    clear(): void {
        this.cache.forEach((entry, key) => {
            this.options.onEvict(key, entry.data);
        });
        this.cache.clear();
    }

    /**
     * Invalidar entradas por patrón (prefix)
     */
    invalidateByPattern(pattern: string): number {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(pattern)) {
                this.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Obtener estadísticas del caché
     */
    getStats(): { size: number; maxSize: number; keys: string[] } {
        return {
            size: this.cache.size,
            maxSize: this.options.maxSize,
            keys: Array.from(this.cache.keys()),
        };
    }

    /**
     * Obtener o crear: si existe en caché lo devuelve, si no ejecuta la función
     */
    async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const data = await fetchFn();
        this.set(key, data, ttl);
        return data;
    }

    private isExpired(entry: CacheEntry<unknown>): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    private startCleanupInterval(): void {
        // Cada minuto, limpiar entries expirados
        setInterval(() => {
            for (const [key, entry] of this.cache.entries()) {
                if (this.isExpired(entry)) {
                    this.delete(key);
                }
            }
        }, 60 * 1000);
    }
}

// ============================================
// Cache Keys - Constantes para claves de caché
// ============================================
export const CACHE_KEYS = {
    // Clientes
    clientsByBusiness: (businessId: string) => `clients:business:${businessId}`,
    clientById: (clientId: string) => `clients:id:${clientId}`,
    clientSearch: (businessId: string, term: string) =>
        `clients:search:${businessId}:${term}`,

    // Transferencias
    transfersByBusiness: (businessId: string) => `transfers:business:${businessId}`,
    transfersByClient: (clientId: string) => `transfers:client:${clientId}`,
    eligibility: (documentNumber: string, businessId: string) =>
        `eligibility:${documentNumber}:${businessId}`,

    // Patrones para invalidación
    PATTERNS: {
        ALL_CLIENTS: 'clients:',
        ALL_TRANSFERS: 'transfers:',
        ALL_ELIGIBILITY: 'eligibility:',
        BUSINESS_CLIENTS: (businessId: string) => `clients:business:${businessId}`,
        BUSINESS_TRANSFERS: (businessId: string) => `transfers:business:${businessId}`,
    },
} as const;

// ============================================
// TTL Presets - Tiempos de vida predefinidos
// ============================================
export const CACHE_TTL = {
    SHORT: 1 * 60 * 1000, // 1 minuto
    MEDIUM: 5 * 60 * 1000, // 5 minutos
    LONG: 15 * 60 * 1000, // 15 minutos
    HOUR: 60 * 60 * 1000, // 1 hora
    ELIGIBILITY: 30 * 1000, // 30 segundos (datos sensibles)
} as const;

// ============================================
// Instancia global del caché
// ============================================
export const appCache = new CacheStore({
    ttl: CACHE_TTL.MEDIUM,
    maxSize: 200,
    onEvict: (key) => {
        if (import.meta.env.DEV) {
            console.debug(`[Cache] Evicted: ${key}`);
        }
    },
});

// ============================================
// Hook para usar el caché en componentes React
// ============================================
export function useCache() {
    return {
        get: <T>(key: string) => appCache.get<T>(key),
        set: <T>(key: string, data: T, ttl?: number) => appCache.set(key, data, ttl),
        has: (key: string) => appCache.has(key),
        delete: (key: string) => appCache.delete(key),
        clear: () => appCache.clear(),
        invalidateByPattern: (pattern: string) => appCache.invalidateByPattern(pattern),
        getOrSet: <T>(key: string, fn: () => Promise<T>, ttl?: number) =>
            appCache.getOrSet(key, fn, ttl),
        getStats: () => appCache.getStats(),
        keys: CACHE_KEYS,
        ttl: CACHE_TTL,
    };
}

// ============================================
// Funciones de utilidad para invalidación
// ============================================
export const cacheInvalidation = {
    /**
     * Invalida todo el caché de clientes de un negocio
     * Llamar después de crear, actualizar o eliminar un cliente
     */
    invalidateBusinessClients: (businessId: string) => {
        appCache.invalidateByPattern(`clients:business:${businessId}`);
        appCache.invalidateByPattern(`clients:search:${businessId}`);
    },

    /**
     * Invalida el caché de un cliente específico
     */
    invalidateClient: (clientId: string) => {
        appCache.delete(CACHE_KEYS.clientById(clientId));
    },

    /**
     * Invalida todo el caché de transferencias de un negocio
     * Llamar después de crear una transferencia
     */
    invalidateBusinessTransfers: (businessId: string) => {
        appCache.invalidateByPattern(`transfers:business:${businessId}`);
    },

    /**
     * Invalida el caché de elegibilidad de un documento
     * Llamar después de crear una transferencia
     */
    invalidateEligibility: (documentNumber: string) => {
        appCache.invalidateByPattern(`eligibility:${documentNumber}`);
    },

    /**
     * Invalida todo después de una transferencia exitosa
     */
    afterTransferCreated: (businessId: string, documentNumber: string, clientId: string) => {
        cacheInvalidation.invalidateBusinessTransfers(businessId);
        cacheInvalidation.invalidateEligibility(documentNumber);
        appCache.invalidateByPattern(`transfers:client:${clientId}`);
    },

    /**
     * Invalida todo después de modificar un cliente
     */
    afterClientModified: (businessId: string, clientId: string) => {
        cacheInvalidation.invalidateBusinessClients(businessId);
        cacheInvalidation.invalidateClient(clientId);
    },

    /**
     * Limpia todo el caché (útil al cerrar sesión)
     */
    clearAll: () => {
        appCache.clear();
    },
};

export default appCache;
