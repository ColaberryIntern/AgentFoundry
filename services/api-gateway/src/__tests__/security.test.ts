/* eslint-disable @typescript-eslint/no-explicit-any */
// Set environment before importing anything
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { initModels } from '../models';
import { resetRateLimiters, RATE_LIMIT_TIERS } from '../middleware/rateLimiter';
import { sanitizeValue, stripHtmlTags } from '../middleware/sanitize';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

beforeAll(async () => {
  await initModels();
});

beforeEach(() => {
  resetRateLimiters();
});

// ---------------------------------------------------------------------------
// XSS Prevention — sanitize middleware
// ---------------------------------------------------------------------------
describe('XSS Prevention', () => {
  describe('stripHtmlTags', () => {
    it('strips simple HTML tags from strings', () => {
      expect(stripHtmlTags('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('strips nested HTML tags', () => {
      expect(stripHtmlTags('<div><b>hello</b></div>')).toBe('hello');
    });

    it('trims whitespace', () => {
      expect(stripHtmlTags('  hello world  ')).toBe('hello world');
    });

    it('returns empty string for only tags', () => {
      expect(stripHtmlTags('<script></script>')).toBe('');
    });

    it('preserves plain text', () => {
      expect(stripHtmlTags('plain text')).toBe('plain text');
    });
  });

  describe('sanitizeValue', () => {
    it('sanitizes strings by stripping HTML', () => {
      expect(sanitizeValue('<b>bold</b>')).toBe('bold');
    });

    it('recursively sanitizes objects', () => {
      const input = { name: '<script>xss</script>', age: 25 };
      const result = sanitizeValue(input);
      expect(result.name).toBe('xss');
      expect(result.age).toBe(25);
    });

    it('recursively sanitizes arrays', () => {
      const input = ['<b>one</b>', '<i>two</i>'];
      const result = sanitizeValue(input);
      expect(result).toEqual(['one', 'two']);
    });

    it('handles nested objects and arrays', () => {
      const input = {
        items: [{ name: '<script>alert(1)</script>' }],
        meta: { tag: '<div>test</div>' },
      };
      const result = sanitizeValue(input);
      expect(result.items[0].name).toBe('alert(1)');
      expect(result.meta.tag).toBe('test');
    });

    it('preserves null, numbers, and booleans', () => {
      expect(sanitizeValue(null)).toBeNull();
      expect(sanitizeValue(42)).toBe(42);
      expect(sanitizeValue(true)).toBe(true);
    });
  });

  describe('POST requests with HTML in body', () => {
    it('sanitizes HTML tags from request body', async () => {
      const token = generateToken({
        userId: 'user-1',
        email: 'test@example.com',
        role: 'it_admin',
      });
      const res = await request(app)
        .post('/api/search/natural')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: '<script>alert("xss")</script>GDPR compliance' });

      // The request should succeed (sanitized input is processed)
      // The query should have HTML stripped before processing
      expect(res.status).toBe(200);
      // The sanitized query should not contain script tags
      expect(res.body.structuredQuery?.query).not.toContain('<script>');
    });
  });
});

// ---------------------------------------------------------------------------
// SQL Injection Prevention
// ---------------------------------------------------------------------------
describe('SQL Injection Prevention', () => {
  it('handles SQL injection attempts in query params safely', async () => {
    const token = generateToken({ userId: 'user-1', email: 'test@example.com', role: 'it_admin' });
    const res = await request(app)
      .get('/api/search')
      .query({ q: "'; DROP TABLE users; --" })
      .set('Authorization', `Bearer ${token}`);

    // The request should not crash the server — it either returns results
    // or an empty set, but must not cause a 500 error from SQL injection
    expect(res.status).not.toBe(500);
  });

  it('handles SQL injection attempts in request body safely', async () => {
    const token = generateToken({ userId: 'user-1', email: 'test@example.com', role: 'it_admin' });
    const res = await request(app)
      .post('/api/search/natural')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: "1' OR '1'='1' --" });

    // Should not cause a 500 server error
    expect(res.status).not.toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Authentication & JWT
// ---------------------------------------------------------------------------
describe('Authentication & JWT', () => {
  it('returns 401 for protected routes without a token', async () => {
    const res = await request(app).get('/api/search');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('returns 401 for an invalid JWT token', async () => {
    const res = await request(app)
      .get('/api/search')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('returns 401 for an expired JWT token', async () => {
    const expired = jwt.sign({ userId: 'user-1', email: 'test@example.com' }, JWT_SECRET, {
      expiresIn: '0s',
    });

    const res = await request(app).get('/api/search').set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('returns 401 for a token signed with wrong secret', async () => {
    const wrongSecret = jwt.sign({ userId: 'user-1', email: 'test@example.com' }, 'wrong-secret', {
      expiresIn: '1h',
    });

    const res = await request(app).get('/api/search').set('Authorization', `Bearer ${wrongSecret}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('returns 401 for malformed Authorization header (no Bearer prefix)', async () => {
    const res = await request(app).get('/api/search').set('Authorization', 'Token some-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('accepts a valid JWT and allows access to protected routes', async () => {
    const token = generateToken({ userId: 'user-1', email: 'test@example.com', role: 'it_admin' });
    const res = await request(app)
      .get('/api/search')
      .query({ q: 'test' })
      .set('Authorization', `Bearer ${token}`);

    // Should not be 401 or 403 — the route is accessible
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------
describe('Security Headers', () => {
  it('includes X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('includes X-Frame-Options: DENY', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('includes Strict-Transport-Security header', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['strict-transport-security']).toContain('max-age=');
  });

  it('includes Permissions-Policy header', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['permissions-policy']).toBeDefined();
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['permissions-policy']).toContain('microphone=()');
    expect(res.headers['permissions-policy']).toContain('geolocation=()');
  });

  it('includes Content-Security-Policy header', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('includes Referrer-Policy header', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['referrer-policy']).toBeDefined();
  });

  it('includes X-DNS-Prefetch-Control header', async () => {
    const res = await request(app).get('/health');

    // Helmet sets this by default
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// CORS Headers
// ---------------------------------------------------------------------------
describe('CORS Headers', () => {
  it('includes Access-Control-Allow-Origin for configured origin', async () => {
    const res = await request(app).options('/api/search').set('Origin', 'http://localhost:5173');

    // CORS should respond with the allowed origin
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('includes Access-Control-Allow-Credentials header', async () => {
    const res = await request(app).options('/api/search').set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow wildcard CORS origin', async () => {
    const res = await request(app).options('/api/search').set('Origin', 'http://localhost:5173');

    // Should be a specific origin, not *
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------
describe('Rate Limiting (Security)', () => {
  it('returns 429 after exceeding the free tier limit', async () => {
    const limit = RATE_LIMIT_TIERS.free.maxRequests;

    // Fire (limit) requests to exhaust the quota
    const promises = [];
    for (let i = 0; i < limit; i++) {
      promises.push(request(app).get('/health'));
    }
    await Promise.all(promises);

    // The next request should be rate-limited
    const res = await request(app).get('/health');
    expect(res.status).toBe(429);
    expect(res.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
  });

  it('includes rate limit headers in responses', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-ratelimit-limit']).toBeDefined();
  });
});
