// Set environment before importing anything
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { sequelize, SearchHistory, initModels } from '../models';
import { cache } from '../utils/cache';

const JWT_SECRET = 'test-jwt-secret-for-gateway';

/**
 * Helper: generate a valid JWT for a test user.
 */
function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = {
  userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  email: 'test@example.com',
  role: 'admin',
};
let token: string;

beforeAll(async () => {
  await initModels();
  token = generateToken(testUser);
});

afterEach(async () => {
  // Clean up search history and cache between tests
  await SearchHistory.destroy({ where: {} });
  cache.clear();
});

afterAll(async () => {
  await sequelize.close();
});

// ---------------------------------------------------------------------------
// Test 1: GET /api/search?q=compliance — 200, returns results array
// ---------------------------------------------------------------------------
describe('GET /api/search', () => {
  it('returns 200 with results for a valid query', async () => {
    const res = await request(app)
      .get('/api/search?q=compliance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(res.body).toHaveProperty('query', 'compliance');

    // Each result has the expected shape
    const first = res.body.results[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('type');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('description');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('createdAt');
    expect(first).toHaveProperty('matchScore');
  });

  // ---------------------------------------------------------------------------
  // Test 2: GET /api/search without q — 400, query is required
  // ---------------------------------------------------------------------------
  it('returns 400 when q parameter is missing', async () => {
    const res = await request(app).get('/api/search').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('message');
  });

  // ---------------------------------------------------------------------------
  // Test 3: GET /api/search?q=test&type=compliance — 200, filters by type
  // ---------------------------------------------------------------------------
  it('filters results by type=compliance', async () => {
    const res = await request(app)
      .get('/api/search?q=compliance&type=compliance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    res.body.results.forEach((r: { type: string }) => {
      expect(r.type).toBe('compliance');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: GET /api/search?q=test&type=reports — 200, filters by type
  // ---------------------------------------------------------------------------
  it('filters results by type=reports', async () => {
    const res = await request(app)
      .get('/api/search?q=report&type=reports')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    res.body.results.forEach((r: { type: string }) => {
      expect(r.type).toBe('report');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: GET /api/search?q=test&page=1&limit=5 — 200, pagination works
  // ---------------------------------------------------------------------------
  it('respects pagination parameters', async () => {
    const res = await request(app)
      .get('/api/search?q=compliance&page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeLessThanOrEqual(2);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 2);
    expect(res.body.total).toBeGreaterThanOrEqual(res.body.results.length);
  });

  // ---------------------------------------------------------------------------
  // Test 6: GET /api/search — 401, no auth
  // ---------------------------------------------------------------------------
  it('returns 401 when no authorization header is provided', async () => {
    const res = await request(app).get('/api/search?q=test');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  // ---------------------------------------------------------------------------
  // Test 14: GET /api/search?q=test&status=compliant — 200, filters by status
  // ---------------------------------------------------------------------------
  it('filters results by status', async () => {
    const res = await request(app)
      .get('/api/search?q=compliance&status=compliant')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.results.forEach((r: { status: string }) => {
      expect(r.status).toBe('compliant');
    });
  });

  // ---------------------------------------------------------------------------
  // Test 15: GET /api/search?q=test&dateFrom=2024-01-01&dateTo=2024-12-31 — 200, date range filter
  // ---------------------------------------------------------------------------
  it('filters results by date range', async () => {
    const res = await request(app)
      .get('/api/search?q=compliance&dateFrom=2024-01-01&dateTo=2024-12-31')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    res.body.results.forEach((r: { createdAt: string }) => {
      const date = new Date(r.createdAt);
      expect(date.getTime()).toBeGreaterThanOrEqual(new Date('2024-01-01').getTime());
      expect(date.getTime()).toBeLessThanOrEqual(new Date('2024-12-31T23:59:59.999Z').getTime());
    });
  });
});

// ---------------------------------------------------------------------------
// Suggestions endpoint
// ---------------------------------------------------------------------------
describe('GET /api/search/suggestions', () => {
  // ---------------------------------------------------------------------------
  // Test 7: GET /api/search/suggestions?q=comp — 200, returns suggestions array
  // ---------------------------------------------------------------------------
  it('returns 200 with suggestions array', async () => {
    // First, perform a search to populate history
    await request(app).get('/api/search?q=compliance').set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/search/suggestions?q=comp')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('suggestions');
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 8: GET /api/search/suggestions?q=a — 400, min 2 chars
  // ---------------------------------------------------------------------------
  it('returns 400 when q is less than 2 characters', async () => {
    const res = await request(app)
      .get('/api/search/suggestions?q=a')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ---------------------------------------------------------------------------
  // Test 9: GET /api/search/suggestions — 401, no auth
  // ---------------------------------------------------------------------------
  it('returns 401 when no authorization header is provided', async () => {
    const res = await request(app).get('/api/search/suggestions?q=comp');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  // ---------------------------------------------------------------------------
  // Test 13: Suggestions return recent searches
  // ---------------------------------------------------------------------------
  it('returns recent searches as suggestions', async () => {
    // Perform two searches with different queries
    await request(app)
      .get('/api/search?q=compliance audit')
      .set('Authorization', `Bearer ${token}`);

    await request(app)
      .get('/api/search?q=compliance review')
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/search/suggestions?q=compliance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.suggestions.length).toBeGreaterThanOrEqual(2);
    // Suggestions should be most recent first
    expect(res.body.suggestions).toContain('compliance review');
    expect(res.body.suggestions).toContain('compliance audit');
  });
});

// ---------------------------------------------------------------------------
// History endpoint
// ---------------------------------------------------------------------------
describe('GET /api/search/history', () => {
  // ---------------------------------------------------------------------------
  // Test 10: GET /api/search/history — 200, returns search history
  // ---------------------------------------------------------------------------
  it('returns 200 with search history array', async () => {
    const res = await request(app)
      .get('/api/search/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('history');
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 11: GET /api/search/history — 401, no auth
  // ---------------------------------------------------------------------------
  it('returns 401 when no authorization header is provided', async () => {
    const res = await request(app).get('/api/search/history');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  // ---------------------------------------------------------------------------
  // Test 12: Search saves to history — search, then check history
  // ---------------------------------------------------------------------------
  it('saves searches to history and retrieves them', async () => {
    // Perform a search
    await request(app).get('/api/search?q=compliance').set('Authorization', `Bearer ${token}`);

    // Check history
    const res = await request(app)
      .get('/api/search/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.history.length).toBeGreaterThanOrEqual(1);

    const latest = res.body.history[0];
    expect(latest).toHaveProperty('query', 'compliance');
    expect(latest).toHaveProperty('resultCount');
    expect(latest.resultCount).toBeGreaterThan(0);
    expect(latest).toHaveProperty('filters');
    expect(latest).toHaveProperty('createdAt');
  });
});
