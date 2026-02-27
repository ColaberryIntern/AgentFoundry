import { Request, Response, NextFunction } from 'express';
import { cache } from '../utils/cache';

/**
 * Build a cache key from the request.
 * Includes the prefix, full URL path, query string, and authenticated user ID
 * so that different users receive their own cached responses.
 */
function buildCacheKey(prefix: string, req: Request): string {
  const user = (req as Request & { user?: { userId?: string } }).user;
  const userId = user?.userId ?? 'anon';
  return `cache:${prefix}:${userId}:${req.originalUrl}`;
}

/**
 * Factory that returns an Express middleware which caches GET responses
 * in Redis (with in-memory fallback) for the specified TTL.
 *
 * Non-GET requests (POST, PUT, DELETE, PATCH) are never cached and
 * instead invalidate keys matching the given prefix for the current user.
 *
 * @param prefix  A short string identifying the cache bucket (e.g. "dashboard")
 * @param ttlSeconds  Time-to-live for cached entries
 */
export function cacheResponse(prefix: string, ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      // Invalidate the cache for this prefix + user on mutations
      const key = buildCacheKey(prefix, req);
      await cache.del(key);
      next();
      return;
    }

    const key = buildCacheKey(prefix, req);

    try {
      const cached = await cache.get<{
        status: number;
        body: unknown;
        headers: Record<string, string>;
      }>(key);
      if (cached) {
        // Set original content-type and cache-hit header
        if (cached.headers) {
          for (const [h, v] of Object.entries(cached.headers)) {
            res.setHeader(h, v);
          }
        }
        res.setHeader('X-Cache', 'HIT');
        res.status(cached.status).json(cached.body);
        return;
      }
    } catch {
      // Cache read error — proceed without cache
    }

    // Intercept the response to store it in cache
    const originalJson = res.json.bind(res);

    res.json = function cachedJson(body: unknown) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const headersToCache: Record<string, string> = {};
        const ct = res.getHeader('content-type');
        if (ct) headersToCache['content-type'] = String(ct);

        cache
          .set(key, { status: res.statusCode, body, headers: headersToCache }, ttlSeconds)
          .catch(() => {
            // Ignore cache write errors
          });
      }

      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}
