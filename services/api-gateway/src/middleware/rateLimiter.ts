import { Request, Response, NextFunction } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../utils/redisClient';

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------
export interface RateLimitTier {
  name: string;
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: { name: 'free', maxRequests: 60, windowMs: 60_000 },
  standard: { name: 'standard', maxRequests: 300, windowMs: 60_000 },
  enterprise: { name: 'enterprise', maxRequests: 1000, windowMs: 60_000 },
};

// ---------------------------------------------------------------------------
// Build a rate limiter instance for a given tier.
// Uses Redis store when available, falls back to the default in-memory store.
// ---------------------------------------------------------------------------
function buildLimiter(tier: RateLimitTier): RateLimitRequestHandler {
  const redis = getRedisClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeOption: any = {};

  if (redis && process.env.NODE_ENV !== 'test') {
    storeOption.store = new RedisStore({
      // Use `sendCommand` adapter expected by rate-limit-redis
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: ((...args: string[]) => redis.call(args[0], ...args.slice(1))) as any,
      prefix: `rl:${tier.name}:`,
    });
  }

  return rateLimit({
    windowMs: tier.windowMs,
    max: tier.maxRequests,
    standardHeaders: false,
    legacyHeaders: false,
    ...storeOption,
    keyGenerator: (req: Request) => {
      // Use user ID for authenticated requests, IP for anonymous
      return (req as Request & { user?: { userId?: string } }).user?.userId ?? req.ip ?? 'unknown';
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded for ${tier.name} tier. Maximum ${tier.maxRequests} requests per minute.`,
          details: null,
        },
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Pre-initialize all tier limiters at module load time
// (express-rate-limit v7 requires creation outside request handlers)
// ---------------------------------------------------------------------------
let tierLimiters: Record<string, RateLimitRequestHandler> = {
  free: buildLimiter(RATE_LIMIT_TIERS.free),
  standard: buildLimiter(RATE_LIMIT_TIERS.standard),
  enterprise: buildLimiter(RATE_LIMIT_TIERS.enterprise),
};

/**
 * Resolve the rate-limit tier for an incoming request.
 *
 * Priority:
 * 1. User role `it_admin` -> enterprise
 * 2. Authenticated user -> standard
 * 3. Unauthenticated -> free
 */
function resolveTier(req: Request): string {
  const user = (req as Request & { user?: { userId?: string; role?: string } }).user;
  if (!user) return 'free';
  if (user.role === 'it_admin') return 'enterprise';
  return 'standard';
}

/**
 * Tier-based rate limiter middleware.
 *
 * Resolves the caller's tier, applies the matching rate limiter, and sets
 * standardised rate-limit response headers:
 *   - X-RateLimit-Limit
 *   - X-RateLimit-Remaining
 *   - X-RateLimit-Reset
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const tierName = resolveTier(req);
  const tier = RATE_LIMIT_TIERS[tierName] ?? RATE_LIMIT_TIERS.free;
  const limiter = tierLimiters[tierName] ?? tierLimiters.free;

  // Attach custom headers after the limiter processes the request.
  const originalEnd = res.end;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.end = function patchedEnd(...args: any[]) {
    if (!res.getHeader('X-RateLimit-Limit')) {
      res.setHeader('X-RateLimit-Limit', tier.maxRequests.toString());
    }
    const remaining = res.getHeader('RateLimit-Remaining');
    if (!res.getHeader('X-RateLimit-Remaining') && remaining !== undefined) {
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
    }
    const reset = res.getHeader('RateLimit-Reset');
    if (!res.getHeader('X-RateLimit-Reset') && reset !== undefined) {
      res.setHeader('X-RateLimit-Reset', reset.toString());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalEnd as (...a: any[]) => any).apply(res, args);
  } as typeof res.end;

  // Set the limit header early so it is present even if the limiter short-circuits
  res.setHeader('X-RateLimit-Limit', tier.maxRequests.toString());

  limiter(req, res, next);
}

/**
 * Reset the in-memory limiter stores — useful for tests.
 * Rebuilds all tier limiters with fresh counters.
 */
export function resetRateLimiters(): void {
  tierLimiters = {
    free: buildLimiter(RATE_LIMIT_TIERS.free),
    standard: buildLimiter(RATE_LIMIT_TIERS.standard),
    enterprise: buildLimiter(RATE_LIMIT_TIERS.enterprise),
  };
}
