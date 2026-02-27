// Set environment before importing anything
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { sequelize, Feedback, initModels } from '../models';

const JWT_SECRET = 'test-jwt-secret-for-gateway';

/**
 * Helper: generate a valid JWT for a test user.
 */
function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const adminUser = {
  userId: 'aaaaaaaa-1111-2222-3333-aaaaaaaaaaaa',
  email: 'admin@example.com',
  role: 'it_admin',
};
const regularUser = {
  userId: 'bbbbbbbb-1111-2222-3333-bbbbbbbbbbbb',
  email: 'user@example.com',
  role: 'employee',
};

let adminToken: string;
let userToken: string;

beforeAll(async () => {
  await initModels();
  adminToken = generateToken(adminUser);
  userToken = generateToken(regularUser);
});

afterEach(async () => {
  await Feedback.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

// ---------------------------------------------------------------------------
// Test 1: POST /api/feedback — 201, creates feedback
// ---------------------------------------------------------------------------
describe('POST /api/feedback', () => {
  it('returns 201 and creates feedback', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ category: 'bug', message: 'Found a bug on the dashboard' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('feedback');
    expect(res.body.feedback).toHaveProperty('id');
    expect(res.body.feedback).toHaveProperty('category', 'bug');
    expect(res.body.feedback).toHaveProperty('message', 'Found a bug on the dashboard');
    expect(res.body.feedback).toHaveProperty('userId', regularUser.userId);
  });

  // ---------------------------------------------------------------------------
  // Test 2: POST /api/feedback with rating — 201, stores rating
  // ---------------------------------------------------------------------------
  it('returns 201 and stores rating', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ category: 'usability', message: 'Great user experience', rating: 5 });

    expect(res.status).toBe(201);
    expect(res.body.feedback).toHaveProperty('rating', 5);
    expect(res.body.feedback).toHaveProperty('category', 'usability');
  });

  // ---------------------------------------------------------------------------
  // Test 3: POST /api/feedback with page context — 201, stores page
  // ---------------------------------------------------------------------------
  it('returns 201 and stores page context', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        category: 'feature_request',
        message: 'Would be great to have dark mode',
        page: '/settings',
      });

    expect(res.status).toBe(201);
    expect(res.body.feedback).toHaveProperty('page', '/settings');
    expect(res.body.feedback).toHaveProperty('category', 'feature_request');
  });

  // ---------------------------------------------------------------------------
  // Test 4: POST /api/feedback missing message — 400
  // ---------------------------------------------------------------------------
  it('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ category: 'bug' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ---------------------------------------------------------------------------
  // Test 5: POST /api/feedback invalid category — 400
  // ---------------------------------------------------------------------------
  it('returns 400 when category is invalid', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ category: 'invalid_category', message: 'Test message' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ---------------------------------------------------------------------------
  // Test 6: POST /api/feedback invalid rating — 400
  // ---------------------------------------------------------------------------
  it('returns 400 when rating is invalid', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ category: 'bug', message: 'Test message', rating: 10 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ---------------------------------------------------------------------------
  // Test 7: POST /api/feedback — 401, no auth
  // ---------------------------------------------------------------------------
  it('returns 401 when no authorization header is provided', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ category: 'bug', message: 'Test message' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// GET /api/feedback — list feedback
// ---------------------------------------------------------------------------
describe('GET /api/feedback', () => {
  // ---------------------------------------------------------------------------
  // Test 8: GET /api/feedback — 200 for admin, returns list
  // ---------------------------------------------------------------------------
  it('returns 200 with feedback list for IT admin', async () => {
    // Seed some feedback
    await Feedback.bulkCreate([
      { userId: regularUser.userId, category: 'bug', message: 'Bug report 1' },
      { userId: regularUser.userId, category: 'feature_request', message: 'Feature request 1' },
      { userId: adminUser.userId, category: 'usability', message: 'Usability feedback' },
    ]);

    const res = await request(app)
      .get('/api/feedback')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('feedback');
    expect(Array.isArray(res.body.feedback)).toBe(true);
    expect(res.body.feedback.length).toBe(3);
    expect(res.body).toHaveProperty('total', 3);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
  });

  // ---------------------------------------------------------------------------
  // Test 9: GET /api/feedback — 403 for non-admin
  // ---------------------------------------------------------------------------
  it('returns 403 for non-admin user', async () => {
    const res = await request(app).get('/api/feedback').set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // Test 10: GET /api/feedback with ?category=bug — 200, filters
  // ---------------------------------------------------------------------------
  it('returns 200 with filtered feedback when ?category=bug is passed', async () => {
    // Seed mixed feedback
    await Feedback.bulkCreate([
      { userId: regularUser.userId, category: 'bug', message: 'Bug 1' },
      { userId: regularUser.userId, category: 'bug', message: 'Bug 2' },
      { userId: regularUser.userId, category: 'feature_request', message: 'Feature 1' },
    ]);

    const res = await request(app)
      .get('/api/feedback?category=bug')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.feedback.length).toBe(2);
    res.body.feedback.forEach((f: { category: string }) => {
      expect(f.category).toBe('bug');
    });
    expect(res.body).toHaveProperty('total', 2);
  });
});

// ---------------------------------------------------------------------------
// GET /api/feedback/stats — feedback statistics
// ---------------------------------------------------------------------------
describe('GET /api/feedback/stats', () => {
  // ---------------------------------------------------------------------------
  // Test 11: GET /api/feedback/stats — 200 for admin, returns counts
  // ---------------------------------------------------------------------------
  it('returns 200 with stats shape for IT admin', async () => {
    // Seed feedback with ratings
    await Feedback.bulkCreate([
      { userId: regularUser.userId, category: 'bug', message: 'Bug 1', rating: 2 },
      { userId: regularUser.userId, category: 'bug', message: 'Bug 2', rating: 4 },
      { userId: regularUser.userId, category: 'feature_request', message: 'Feature 1', rating: 5 },
      { userId: adminUser.userId, category: 'usability', message: 'Usability 1' },
    ]);

    const res = await request(app)
      .get('/api/feedback/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalCount', 4);
    expect(res.body).toHaveProperty('averageRating');
    expect(res.body.averageRating).toBeCloseTo(3.67, 1);
    expect(res.body).toHaveProperty('countsByCategory');
    expect(Array.isArray(res.body.countsByCategory)).toBe(true);

    // Verify category breakdown
    const bugCategory = res.body.countsByCategory.find(
      (c: { category: string }) => c.category === 'bug',
    );
    expect(bugCategory).toBeDefined();
    expect(bugCategory.count).toBe(2);

    const featureCategory = res.body.countsByCategory.find(
      (c: { category: string }) => c.category === 'feature_request',
    );
    expect(featureCategory).toBeDefined();
    expect(featureCategory.count).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Test 12: GET /api/feedback/stats — 403 for non-admin
  // ---------------------------------------------------------------------------
  it('returns 403 for non-admin user', async () => {
    const res = await request(app)
      .get('/api/feedback/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });
});
