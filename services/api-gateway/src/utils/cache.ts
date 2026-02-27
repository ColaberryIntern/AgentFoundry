import { getRedisClient } from './redisClient';

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: unknown, ttlSeconds: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryFallback = new MemoryCache();

// ---------------------------------------------------------------------------
// Unified cache interface — Redis when available, in-memory otherwise
// ---------------------------------------------------------------------------
export const cache = {
  /**
   * Retrieve a cached value by key.
   * Returns `null` on miss or expiry.
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(key);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        // Redis error — fall through to memory
      }
    }
    return memoryFallback.get<T>(key);
  },

  /**
   * Store a value under `key` with a time-to-live in seconds.
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch {
        // Redis error — fall through to memory
      }
    }
    memoryFallback.set(key, value, ttlSeconds);
  },

  /**
   * Delete a single cached key.
   */
  async del(key: string): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(key);
        return;
      } catch {
        // Redis error — fall through to memory
      }
    }
    memoryFallback.del(key);
  },

  /**
   * Clear all cached data.
   * In Redis this issues FLUSHDB; use with caution in production.
   */
  async clear(): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.flushdb();
        return;
      } catch {
        // Redis error — fall through to memory
      }
    }
    memoryFallback.clear();
  },
};

/**
 * Direct access to the in-memory fallback — useful for tests that
 * need synchronous cache without Redis.
 */
export { MemoryCache, memoryFallback };
