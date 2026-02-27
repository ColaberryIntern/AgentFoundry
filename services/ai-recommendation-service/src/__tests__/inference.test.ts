import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';

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

let adminToken: string;

describe('Inference API', () => {
  beforeAll(async () => {
    require('../models');
    await sequelize.sync({ force: true });
    adminToken = generateToken(testUser);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ====================================================================
  // POST /api/inference/compliance-gaps
  // ====================================================================

  describe('POST /api/inference/compliance-gaps', () => {
    it('should return 503 when model server is unavailable', async () => {
      const res = await request(app)
        .post('/api/inference/compliance-gaps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.userId,
          complianceData: [{ framework: 'GDPR', controls: ['consent', 'data_retention'] }],
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toHaveProperty('message');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/inference/compliance-gaps').send({
        userId: 'some-id',
        complianceData: [],
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/inference/compliance-gaps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ====================================================================
  // POST /api/inference/regulatory-predictions
  // ====================================================================

  describe('POST /api/inference/regulatory-predictions', () => {
    it('should return 503 when model server is unavailable', async () => {
      const res = await request(app)
        .post('/api/inference/regulatory-predictions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.userId,
          regulationIds: ['GDPR-2025', 'HIPAA-2025'],
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toHaveProperty('message');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/inference/regulatory-predictions').send({
        userId: 'some-id',
        regulationIds: [],
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/inference/regulatory-predictions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ====================================================================
  // GET /api/inference/health
  // ====================================================================

  describe('GET /api/inference/health', () => {
    it('should return model server status', async () => {
      const res = await request(app)
        .get('/api/inference/health')
        .set('Authorization', `Bearer ${adminToken}`);

      // Model server is not running in tests, so we expect a status indicating offline
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('modelServer');
      expect(res.body.modelServer).toBe('offline');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/inference/health');
      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });
});
