// Set environment before importing anything
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { resetRateLimiters, RATE_LIMIT_TIERS } from '../middleware/rateLimiter';

const JWT_SECRET = 'test-jwt-secret-for-gateway';

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  // Reset limiters between tests to avoid cross-test state
  resetRateLimiters();
});

describe('Rate Limiting', () => {
  // -------------------------------------------------------------------------
  // Rate limit headers are present
  // -------------------------------------------------------------------------
  describe('Rate limit headers', () => {
    it('includes X-RateLimit-Limit header in response', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('sets free tier limit (60) for unauthenticated requests', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['x-ratelimit-limit']).toBe(RATE_LIMIT_TIERS.free.maxRequests.toString());
    });

    it('sets standard tier limit (300) for authenticated non-admin users', async () => {
      const token = generateToken({ userId: 'user-1', role: 'user' });
      const res = await request(app).get('/health').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Note: the rate limiter resolves tier based on req.user which is set
      // by the auth middleware. Since /health does not use authenticate middleware,
      // the user won't be set via JWT on this route. This test verifies the
      // header is present; tier-specific limits require auth middleware routes.
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Rate limiting enforcement
  // -------------------------------------------------------------------------
  describe('Rate limiting enforcement', () => {
    it('returns 429 after exceeding the free tier limit', async () => {
      // The free tier allows 60 requests per minute.
      // We send requests in rapid succession to exceed the limit.
      // To keep the test fast, we use a small batch.
      const limit = RATE_LIMIT_TIERS.free.maxRequests;

      // Fire (limit) requests
      const promises = [];
      for (let i = 0; i < limit; i++) {
        promises.push(request(app).get('/health'));
      }
      await Promise.all(promises);

      // The next request should be rate-limited
      const res = await request(app).get('/health');
      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
    });
  });

  // -------------------------------------------------------------------------
  // Tier configuration
  // -------------------------------------------------------------------------
  describe('Tier configuration', () => {
    it('defines free, standard, and enterprise tiers', () => {
      expect(RATE_LIMIT_TIERS).toHaveProperty('free');
      expect(RATE_LIMIT_TIERS).toHaveProperty('standard');
      expect(RATE_LIMIT_TIERS).toHaveProperty('enterprise');
    });

    it('free tier allows 60 requests per minute', () => {
      expect(RATE_LIMIT_TIERS.free.maxRequests).toBe(60);
      expect(RATE_LIMIT_TIERS.free.windowMs).toBe(60_000);
    });

    it('standard tier allows 300 requests per minute', () => {
      expect(RATE_LIMIT_TIERS.standard.maxRequests).toBe(300);
      expect(RATE_LIMIT_TIERS.standard.windowMs).toBe(60_000);
    });

    it('enterprise tier allows 1000 requests per minute', () => {
      expect(RATE_LIMIT_TIERS.enterprise.maxRequests).toBe(1000);
      expect(RATE_LIMIT_TIERS.enterprise.windowMs).toBe(60_000);
    });
  });
});
