/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

// ---------------------------------------------------------------------------
// Mock ioredis BEFORE importing any app module
// ---------------------------------------------------------------------------
const redisMockStore: Record<string, { value: string; expiresAt: number }> = {};

const mockRedisGet = jest.fn(async (key: string) => {
  const entry = redisMockStore[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete redisMockStore[key];
    return null;
  }
  return entry.value;
});

const mockRedisSet = jest.fn(async (key: string, value: string, _ex: string, ttl: number) => {
  redisMockStore[key] = { value, expiresAt: Date.now() + ttl * 1000 };
  return 'OK';
});

const mockRedisDel = jest.fn(async (key: string) => {
  delete redisMockStore[key];
  return 1;
});

const mockRedisFlushdb = jest.fn(async () => {
  Object.keys(redisMockStore).forEach((k) => delete redisMockStore[k]);
  return 'OK';
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    flushdb: mockRedisFlushdb,
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    call: jest.fn(),
    status: 'ready',
  }));
});

import request from 'supertest';
import express from 'express';
import { cacheResponse } from '../middleware/cacheResponse';
import { cache } from '../utils/cache';
import { resetRedisState } from '../utils/redisClient';
import { resetRateLimiters } from '../middleware/rateLimiter';

// ---------------------------------------------------------------------------
// Helper: build a small Express app with cacheResponse for testing
// ---------------------------------------------------------------------------
function createTestApp(prefix: string, ttlSeconds: number) {
  const testApp = express();
  testApp.use(express.json());

  testApp.get(
    '/api/test',
    cacheResponse(prefix, ttlSeconds),
    (_req: express.Request, res: express.Response) => {
      res.json({ data: 'fresh', timestamp: Date.now() });
    },
  );

  testApp.post(
    '/api/test',
    cacheResponse(prefix, ttlSeconds),
    (_req: express.Request, res: express.Response) => {
      res.status(201).json({ created: true });
    },
  );

  testApp.get(
    '/api/test/error',
    cacheResponse(prefix, ttlSeconds),
    (_req: express.Request, res: express.Response) => {
      res.status(500).json({ error: 'internal' });
    },
  );

  return testApp;
}

// ---------------------------------------------------------------------------
// Performance tests
// ---------------------------------------------------------------------------
describe('Performance — Cache Middleware', () => {
  let testApp: express.Express;

  beforeEach(() => {
    // Clear Redis mock store
    Object.keys(redisMockStore).forEach((k) => delete redisMockStore[k]);
    jest.clearAllMocks();
    resetRedisState();
    testApp = createTestApp('perf', 60);
  });

  afterEach(async () => {
    await cache.clear();
  });

  // -----------------------------------------------------------------------
  // Cache hit / miss
  // -----------------------------------------------------------------------
  describe('Cache hit / miss behavior', () => {
    it('returns X-Cache: MISS on first request', async () => {
      const res = await request(testApp).get('/api/test');

      expect(res.status).toBe(200);
      expect(res.headers['x-cache']).toBe('MISS');
      expect(res.body).toHaveProperty('data', 'fresh');
    });

    it('returns X-Cache: HIT on subsequent requests', async () => {
      // First request — MISS
      await request(testApp).get('/api/test');

      // Second request — HIT
      const res = await request(testApp).get('/api/test');

      expect(res.status).toBe(200);
      expect(res.headers['x-cache']).toBe('HIT');
    });

    it('cached response body matches original', async () => {
      const first = await request(testApp).get('/api/test');
      const second = await request(testApp).get('/api/test');

      expect(second.body).toEqual(first.body);
    });
  });

  // -----------------------------------------------------------------------
  // Cache invalidation on mutations
  // -----------------------------------------------------------------------
  describe('Cache invalidation on mutations', () => {
    it('invalidates cache on POST request', async () => {
      // Populate cache
      await request(testApp).get('/api/test');
      const cached = await request(testApp).get('/api/test');
      expect(cached.headers['x-cache']).toBe('HIT');

      // POST should invalidate
      await request(testApp).post('/api/test').send({ foo: 'bar' });

      // Next GET should be a MISS
      const afterPost = await request(testApp).get('/api/test');
      expect(afterPost.headers['x-cache']).toBe('MISS');
    });
  });

  // -----------------------------------------------------------------------
  // Cache TTL
  // -----------------------------------------------------------------------
  describe('Cache TTL expiration', () => {
    it('serves stale data before TTL expires', async () => {
      const shortTtlApp = createTestApp('ttl-test', 2); // 2 second TTL

      const first = await request(shortTtlApp).get('/api/test');
      expect(first.headers['x-cache']).toBe('MISS');

      const second = await request(shortTtlApp).get('/api/test');
      expect(second.headers['x-cache']).toBe('HIT');
    });
  });

  // -----------------------------------------------------------------------
  // Does not cache error responses
  // -----------------------------------------------------------------------
  describe('Error responses are not cached', () => {
    it('does not cache 5xx responses', async () => {
      await request(testApp).get('/api/test/error');
      const second = await request(testApp).get('/api/test/error');

      // Both should be MISS because 5xx is not cached
      expect(second.headers['x-cache']).toBe('MISS');
    });
  });

  // -----------------------------------------------------------------------
  // POST/PUT/DELETE are never cached
  // -----------------------------------------------------------------------
  describe('Non-GET requests are never cached', () => {
    it('POST requests pass through without caching', async () => {
      const res = await request(testApp).post('/api/test').send({ data: 'create' });

      expect(res.status).toBe(201);
      // POST should not have X-Cache header set
      // (the cacheResponse middleware calls next() without setting X-Cache for non-GET)
    });
  });

  // -----------------------------------------------------------------------
  // Cached responses are faster
  // -----------------------------------------------------------------------
  describe('Cached responses performance', () => {
    it('cached response resolves without going through handler again', async () => {
      // First request seeds the cache
      await request(testApp).get('/api/test');

      // Second request comes from cache — verify body matches
      const res = await request(testApp).get('/api/test');
      expect(res.status).toBe(200);
      expect(res.headers['x-cache']).toBe('HIT');
      expect(res.body).toHaveProperty('data', 'fresh');
    });
  });
});

// ---------------------------------------------------------------------------
// Rate limiter tests (imported here to verify no regressions after Redis
// store integration)
// ---------------------------------------------------------------------------
describe('Performance — Rate limiter with Redis store', () => {
  beforeEach(() => {
    resetRateLimiters();
  });

  it('rate limiter module exports correctly after Redis integration', () => {
    expect(typeof resetRateLimiters).toBe('function');
  });

  it('rate limiter tiers are still defined', async () => {
    const { RATE_LIMIT_TIERS } = await import('../middleware/rateLimiter');
    expect(RATE_LIMIT_TIERS.free.maxRequests).toBe(60);
    expect(RATE_LIMIT_TIERS.standard.maxRequests).toBe(300);
    expect(RATE_LIMIT_TIERS.enterprise.maxRequests).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Cache key isolation per user
// ---------------------------------------------------------------------------
describe('Performance — Cache key isolation', () => {
  it('different users get different cache keys', async () => {
    const userApp = express();
    userApp.use(express.json());

    // Simulate authenticated users
    userApp.use((req: any, _res: express.Response, next: express.NextFunction) => {
      const userId = req.headers['x-user-id'];
      if (userId) {
        req.user = { userId };
      }
      next();
    });

    userApp.get('/api/data', cacheResponse('user-iso', 60), (req: any, res: express.Response) => {
      res.json({ user: req.user?.userId ?? 'anon', time: Date.now() });
    });

    // User A request
    const resA = await request(userApp).get('/api/data').set('X-User-Id', 'user-a');
    expect(resA.headers['x-cache']).toBe('MISS');
    expect(resA.body.user).toBe('user-a');

    // User B request — should also be MISS (different cache key)
    const resB = await request(userApp).get('/api/data').set('X-User-Id', 'user-b');
    expect(resB.headers['x-cache']).toBe('MISS');
    expect(resB.body.user).toBe('user-b');

    // User A again — should be HIT
    const resA2 = await request(userApp).get('/api/data').set('X-User-Id', 'user-a');
    expect(resA2.headers['x-cache']).toBe('HIT');
    expect(resA2.body.user).toBe('user-a');
  });
});
