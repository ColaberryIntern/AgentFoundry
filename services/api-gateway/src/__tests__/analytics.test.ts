// Set environment before importing anything
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { sequelize, UserEvent, initModels } from '../models';

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
const otherUser = {
  userId: 'cccccccc-1111-2222-3333-cccccccccccc',
  email: 'other@example.com',
  role: 'employee',
};

let adminToken: string;
let userToken: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _otherUserToken: string;

beforeAll(async () => {
  await initModels();
  adminToken = generateToken(adminUser);
  userToken = generateToken(regularUser);
  _otherUserToken = generateToken(otherUser);
});

afterEach(async () => {
  await UserEvent.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

// ---------------------------------------------------------------------------
// Test 1: POST /api/analytics/event — 201, creates event
// ---------------------------------------------------------------------------
describe('POST /api/analytics/event', () => {
  it('returns 201 and creates an event', async () => {
    const res = await request(app)
      .post('/api/analytics/event')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventType: 'page_view' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('event');
    expect(res.body.event).toHaveProperty('id');
    expect(res.body.event).toHaveProperty('eventType', 'page_view');
    expect(res.body.event).toHaveProperty('userId', regularUser.userId);
  });

  // ---------------------------------------------------------------------------
  // Test 2: POST /api/analytics/event with eventData — 201, stores JSON data
  // ---------------------------------------------------------------------------
  it('returns 201 and stores eventData JSON', async () => {
    const res = await request(app)
      .post('/api/analytics/event')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventType: 'feature_use',
        eventData: { featureName: 'compliance_dashboard', section: 'overview' },
        sessionId: 'sess-123',
      });

    expect(res.status).toBe(201);
    expect(res.body.event).toHaveProperty('eventType', 'feature_use');
    expect(res.body.event.eventData).toEqual({
      featureName: 'compliance_dashboard',
      section: 'overview',
    });
    expect(res.body.event).toHaveProperty('sessionId', 'sess-123');
  });

  // ---------------------------------------------------------------------------
  // Test 3: POST /api/analytics/event without eventType — 400
  // ---------------------------------------------------------------------------
  it('returns 400 when eventType is missing', async () => {
    const res = await request(app)
      .post('/api/analytics/event')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventData: { page: 'home' } });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ---------------------------------------------------------------------------
  // Test 4: POST /api/analytics/event — 401, no auth
  // ---------------------------------------------------------------------------
  it('returns 401 when no authorization header is provided', async () => {
    const res = await request(app).post('/api/analytics/event').send({ eventType: 'page_view' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// Test 5: POST /api/analytics/events — 201, batch creates events, returns count
// ---------------------------------------------------------------------------
describe('POST /api/analytics/events', () => {
  it('returns 201 and creates multiple events', async () => {
    const res = await request(app)
      .post('/api/analytics/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        events: [
          { eventType: 'page_view', eventData: { page: 'home' } },
          { eventType: 'button_click', eventData: { button: 'submit' } },
          { eventType: 'search', eventData: { query: 'compliance' } },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('count', 3);
  });

  // ---------------------------------------------------------------------------
  // Test 6: POST /api/analytics/events with empty array — 400
  // ---------------------------------------------------------------------------
  it('returns 400 when events array is empty', async () => {
    const res = await request(app)
      .post('/api/analytics/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ events: [] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Engagement Stats
// ---------------------------------------------------------------------------
describe('GET /api/analytics/stats', () => {
  // ---------------------------------------------------------------------------
  // Test 7: GET /api/analytics/stats — 200 for it_admin, returns stats shape
  // ---------------------------------------------------------------------------
  it('returns 200 with stats shape for IT admin', async () => {
    // Seed some events first
    await UserEvent.bulkCreate([
      { userId: regularUser.userId, eventType: 'page_view' },
      {
        userId: regularUser.userId,
        eventType: 'feature_use',
        eventData: { featureName: 'dashboard' },
      },
      { userId: adminUser.userId, eventType: 'page_view' },
    ]);

    const res = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalEvents');
    expect(res.body).toHaveProperty('activeUsers');
    expect(res.body).toHaveProperty('eventsByType');
    expect(res.body).toHaveProperty('topFeatures');
    expect(res.body).toHaveProperty('onboardingCompletionRate');
    expect(res.body).toHaveProperty('periodDays', 7);
    expect(Array.isArray(res.body.eventsByType)).toBe(true);
    expect(Array.isArray(res.body.topFeatures)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 8: GET /api/analytics/stats — 403 for non-admin
  // ---------------------------------------------------------------------------
  it('returns 403 for non-admin user', async () => {
    const res = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // Test 9: GET /api/analytics/stats — 401, no auth
  // ---------------------------------------------------------------------------
  it('returns 401 when no authorization header is provided', async () => {
    const res = await request(app).get('/api/analytics/stats');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  // ---------------------------------------------------------------------------
  // Test 10: GET /api/analytics/stats with ?days=30 — 200, uses custom period
  // ---------------------------------------------------------------------------
  it('returns 200 with custom period when ?days=30 is passed', async () => {
    const res = await request(app)
      .get('/api/analytics/stats?days=30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('periodDays', 30);
  });
});

// ---------------------------------------------------------------------------
// User Activity
// ---------------------------------------------------------------------------
describe('GET /api/analytics/users/:userId/activity', () => {
  // ---------------------------------------------------------------------------
  // Test 11: GET /api/analytics/users/:userId/activity — 200 for own user
  // ---------------------------------------------------------------------------
  it('returns 200 when user requests their own activity', async () => {
    // Seed events for this user
    await UserEvent.create({ userId: regularUser.userId, eventType: 'page_view' });

    const res = await request(app)
      .get(`/api/analytics/users/${regularUser.userId}/activity`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('events');
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(res.body.events.length).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // Test 12: GET /api/analytics/users/:userId/activity — 200 for admin viewing another user
  // ---------------------------------------------------------------------------
  it('returns 200 when admin views another user activity', async () => {
    await UserEvent.create({ userId: regularUser.userId, eventType: 'button_click' });

    const res = await request(app)
      .get(`/api/analytics/users/${regularUser.userId}/activity`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('events');
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 13: GET /api/analytics/users/:userId/activity — 403 for non-admin viewing another user
  // ---------------------------------------------------------------------------
  it('returns 403 when non-admin tries to view another user activity', async () => {
    const res = await request(app)
      .get(`/api/analytics/users/${otherUser.userId}/activity`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// Test 14: Event tracking verifiable: track 3 events, then check stats reflects them
// ---------------------------------------------------------------------------
describe('End-to-end: track events then verify stats', () => {
  it('tracks 3 events via API and verifies stats reflect them', async () => {
    // Track 3 events via the POST endpoint
    await request(app)
      .post('/api/analytics/event')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventType: 'page_view', eventData: { page: 'home' } });

    await request(app)
      .post('/api/analytics/event')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventType: 'page_view', eventData: { page: 'settings' } });

    await request(app)
      .post('/api/analytics/event')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventType: 'button_click', eventData: { button: 'save' } });

    // Verify stats via GET (as admin)
    const res = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalEvents).toBe(3);
    expect(res.body.activeUsers).toBe(1);

    // Verify eventsByType breakdown
    const pageViewType = res.body.eventsByType.find(
      (e: { eventType: string }) => e.eventType === 'page_view',
    );
    const buttonClickType = res.body.eventsByType.find(
      (e: { eventType: string }) => e.eventType === 'button_click',
    );
    expect(pageViewType).toBeDefined();
    expect(pageViewType.count).toBe(2);
    expect(buttonClickType).toBeDefined();
    expect(buttonClickType.count).toBe(1);
  });
});
