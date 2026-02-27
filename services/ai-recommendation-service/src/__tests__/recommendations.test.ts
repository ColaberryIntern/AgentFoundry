import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import { Recommendation } from '../models/Recommendation';
import { ModelRegistry } from '../models/ModelRegistry';

// Force test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
process.env.JWT_SECRET = JWT_SECRET;

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@test.com',
  role: 'it_admin',
};

const regularUser = {
  userId: '550e8400-e29b-41d4-a716-446655440010',
  email: 'regular@test.com',
  role: 'compliance_officer',
};

let adminToken: string;

describe('Recommendations API', () => {
  beforeAll(async () => {
    require('../models');
    await sequelize.sync({ force: true });
    adminToken = generateToken(testUser);
  });

  afterEach(async () => {
    await Recommendation.destroy({ where: {} });
    await ModelRegistry.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ====================================================================
  // GET /api/recommendations
  // ====================================================================

  describe('GET /api/recommendations', () => {
    it('should return 200 with paginated recommendations', async () => {
      // Seed recommendations
      await Recommendation.bulkCreate([
        {
          userId: testUser.userId,
          type: 'compliance_gap',
          title: 'Missing GDPR consent',
          description: 'Your app lacks GDPR consent.',
          confidence: 0.9,
        },
        {
          userId: testUser.userId,
          type: 'optimization',
          title: 'Optimize retention',
          description: 'Reduce data retention period.',
          confidence: 0.75,
        },
      ]);

      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toHaveLength(2);
      expect(res.body.pagination).toHaveProperty('total', 2);
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter by userId', async () => {
      await Recommendation.bulkCreate([
        {
          userId: testUser.userId,
          type: 'compliance_gap',
          title: 'Rec A',
          description: 'Desc A',
          confidence: 0.9,
        },
        {
          userId: regularUser.userId,
          type: 'optimization',
          title: 'Rec B',
          description: 'Desc B',
          confidence: 0.8,
        },
      ]);

      const res = await request(app)
        .get(`/api/recommendations?userId=${testUser.userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toHaveLength(1);
      expect(res.body.recommendations[0].userId).toBe(testUser.userId);
    });

    it('should filter by type', async () => {
      await Recommendation.bulkCreate([
        {
          userId: testUser.userId,
          type: 'compliance_gap',
          title: 'Rec A',
          description: 'Desc A',
          confidence: 0.9,
        },
        {
          userId: testUser.userId,
          type: 'risk_alert',
          title: 'Rec B',
          description: 'Desc B',
          confidence: 0.8,
        },
      ]);

      const res = await request(app)
        .get('/api/recommendations?type=compliance_gap')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toHaveLength(1);
      expect(res.body.recommendations[0].type).toBe('compliance_gap');
    });

    it('should filter by status', async () => {
      await Recommendation.bulkCreate([
        {
          userId: testUser.userId,
          type: 'compliance_gap',
          title: 'Active rec',
          description: 'Desc',
          confidence: 0.9,
          status: 'active',
        },
        {
          userId: testUser.userId,
          type: 'optimization',
          title: 'Dismissed rec',
          description: 'Desc',
          confidence: 0.8,
          status: 'dismissed',
        },
      ]);

      const res = await request(app)
        .get('/api/recommendations?status=active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toHaveLength(1);
      expect(res.body.recommendations[0].status).toBe('active');
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await Recommendation.create({
          userId: testUser.userId,
          type: 'compliance_gap',
          title: `Rec ${i}`,
          description: `Desc ${i}`,
          confidence: 0.9,
        });
      }

      const res = await request(app)
        .get('/api/recommendations?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toHaveLength(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/recommendations');
      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ====================================================================
  // GET /api/recommendations/:id
  // ====================================================================

  describe('GET /api/recommendations/:id', () => {
    it('should return 200 for existing recommendation', async () => {
      const rec = await Recommendation.create({
        userId: testUser.userId,
        type: 'compliance_gap',
        title: 'Test rec',
        description: 'Test desc',
        confidence: 0.85,
        category: 'GDPR',
      });

      const res = await request(app)
        .get(`/api/recommendations/${rec.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(rec.id);
      expect(res.body.title).toBe('Test rec');
      expect(res.body.category).toBe('GDPR');
    });

    it('should return 404 for non-existent recommendation', async () => {
      const res = await request(app)
        .get('/api/recommendations/00000000-0000-0000-0000-000000000099')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // ====================================================================
  // POST /api/recommendations/feedback
  // ====================================================================

  describe('POST /api/recommendations/feedback', () => {
    it('should accept a recommendation', async () => {
      const rec = await Recommendation.create({
        userId: testUser.userId,
        type: 'compliance_gap',
        title: 'Accept me',
        description: 'Should be accepted',
        confidence: 0.9,
        status: 'active',
      });

      const res = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recommendationId: rec.id, action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('accepted');
    });

    it('should dismiss a recommendation', async () => {
      const rec = await Recommendation.create({
        userId: testUser.userId,
        type: 'optimization',
        title: 'Dismiss me',
        description: 'Should be dismissed',
        confidence: 0.7,
        status: 'active',
      });

      const res = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recommendationId: rec.id, action: 'dismiss' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('dismissed');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/recommendations/feedback')
        .send({ recommendationId: 'some-id', action: 'accept' });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid action', async () => {
      const res = await request(app)
        .post('/api/recommendations/feedback')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recommendationId: 'some-id', action: 'invalid' });

      expect(res.status).toBe(400);
    });
  });
});
