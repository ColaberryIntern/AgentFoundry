interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * Simple in-memory cache for MVP use.
 * In production this would be replaced by Redis or a similar distributed cache.
 */
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

export const cache = new MemoryCache();
