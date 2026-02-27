// Force test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = 'changeme';
process.env.JWT_SECRET = JWT_SECRET;

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import { UserInteraction } from '../models/UserInteraction';

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@test.com',
  role: 'it_admin',
};

let token: string;

describe('Interactions API', () => {
  beforeAll(async () => {
    require('../models');
    await sequelize.sync({ force: true });
    token = generateToken(testUser);
  });

  afterEach(async () => {
    await UserInteraction.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // =======================================================================
  // POST /api/interactions
  // =======================================================================

  describe('POST /api/interactions', () => {
    it('should return 201 and create an interaction', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          interactionType: 'page_view',
          target: 'dashboard',
          metadata: { section: 'overview' },
          sessionId: 'sess-123',
          duration: 3000,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe(testUser.userId);
      expect(res.body.interactionType).toBe('page_view');
      expect(res.body.target).toBe('dashboard');
      expect(res.body.sessionId).toBe('sess-123');
      expect(res.body.duration).toBe(3000);
    });

    it('should return 201 with only required fields', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          interactionType: 'feature_use',
          target: 'export_button',
        });

      expect(res.status).toBe(201);
      expect(res.body.interactionType).toBe('feature_use');
      expect(res.body.target).toBe('export_button');
      expect(res.body.metadata).toBeNull();
      expect(res.body.sessionId).toBeNull();
      expect(res.body.duration).toBeNull();
    });

    it('should return 400 when interactionType is missing', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ target: 'dashboard' });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when interactionType is invalid', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ interactionType: 'invalid_type', target: 'dashboard' });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when target is missing', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ interactionType: 'page_view' });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/interactions')
        .send({ interactionType: 'page_view', target: 'dashboard' });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // =======================================================================
  // POST /api/interactions/batch
  // =======================================================================

  describe('POST /api/interactions/batch', () => {
    it('should return 201 and create multiple interactions', async () => {
      const res = await request(app)
        .post('/api/interactions/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          interactions: [
            { interactionType: 'page_view', target: 'dashboard' },
            { interactionType: 'search', target: 'search_bar', metadata: { query: 'GDPR' } },
            { interactionType: 'feature_use', target: 'export', duration: 1500 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.created).toBe(3);
      expect(res.body.interactions).toHaveLength(3);
      expect(res.body.interactions[0].userId).toBe(testUser.userId);
    });

    it('should return 400 when interactions is not an array', async () => {
      const res = await request(app)
        .post('/api/interactions/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({ interactions: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when interactions is an empty array', async () => {
      const res = await request(app)
        .post('/api/interactions/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({ interactions: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when a batch item has invalid interactionType', async () => {
      const res = await request(app)
        .post('/api/interactions/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          interactions: [
            { interactionType: 'page_view', target: 'dashboard' },
            { interactionType: 'bad_type', target: 'search_bar' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when a batch item is missing target', async () => {
      const res = await request(app)
        .post('/api/interactions/batch')
        .set('Authorization', `Bearer ${token}`)
        .send({
          interactions: [
            { interactionType: 'page_view', target: 'dashboard' },
            { interactionType: 'search' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/interactions/batch')
        .send({
          interactions: [{ interactionType: 'page_view', target: 'dashboard' }],
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // =======================================================================
  // GET /api/interactions/summary/:userId
  // =======================================================================

  describe('GET /api/interactions/summary/:userId', () => {
    it('should return 200 with aggregated summary', async () => {
      // Seed interactions
      await UserInteraction.bulkCreate([
        { userId: testUser.userId, interactionType: 'page_view', target: 'dashboard' },
        { userId: testUser.userId, interactionType: 'page_view', target: 'dashboard' },
        { userId: testUser.userId, interactionType: 'page_view', target: 'settings' },
        { userId: testUser.userId, interactionType: 'feature_use', target: 'export' },
        { userId: testUser.userId, interactionType: 'feature_use', target: 'export' },
        { userId: testUser.userId, interactionType: 'feature_use', target: 'filter' },
        { userId: testUser.userId, interactionType: 'search', target: 'search_bar' },
        {
          userId: testUser.userId,
          interactionType: 'dashboard_widget_click',
          target: 'compliance_overview',
        },
      ]);

      const res = await request(app)
        .get(`/api/interactions/summary/${testUser.userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(testUser.userId);
      expect(res.body.totalInteractions).toBe(8);
      expect(Array.isArray(res.body.topFeatures)).toBe(true);
      expect(Array.isArray(res.body.topPages)).toBe(true);
      expect(res.body.interactionsByType).toHaveProperty('page_view', 3);
      expect(res.body.interactionsByType).toHaveProperty('feature_use', 3);
      expect(res.body.interactionsByType).toHaveProperty('search', 1);
      expect(res.body.interactionsByType).toHaveProperty('dashboard_widget_click', 1);
      expect(Array.isArray(res.body.timeWeightedPreferences)).toBe(true);
    });

    it('should return 200 with empty data for a user with no interactions', async () => {
      const res = await request(app)
        .get('/api/interactions/summary/no-such-user')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.totalInteractions).toBe(0);
      expect(res.body.topFeatures).toEqual([]);
      expect(res.body.topPages).toEqual([]);
      expect(res.body.interactionsByType).toEqual({});
      expect(res.body.timeWeightedPreferences).toEqual([]);
    });

    it('should return top pages ranked by frequency', async () => {
      await UserInteraction.bulkCreate([
        { userId: testUser.userId, interactionType: 'page_view', target: 'dashboard' },
        { userId: testUser.userId, interactionType: 'page_view', target: 'dashboard' },
        { userId: testUser.userId, interactionType: 'page_view', target: 'dashboard' },
        { userId: testUser.userId, interactionType: 'page_view', target: 'settings' },
      ]);

      const res = await request(app)
        .get(`/api/interactions/summary/${testUser.userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.topPages[0].name).toBe('dashboard');
      expect(res.body.topPages[0].count).toBe(3);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get(`/api/interactions/summary/${testUser.userId}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });
});
