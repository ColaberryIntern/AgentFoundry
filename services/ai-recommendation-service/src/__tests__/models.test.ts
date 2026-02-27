import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
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

let adminToken: string;

describe('Models API', () => {
  beforeAll(async () => {
    require('../models');
    await sequelize.sync({ force: true });
    adminToken = generateToken(testUser);
  });

  afterEach(async () => {
    await ModelRegistry.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ====================================================================
  // GET /api/models
  // ====================================================================

  describe('GET /api/models', () => {
    it('should return 200 with paginated models', async () => {
      await ModelRegistry.bulkCreate([
        { name: 'model-a', version: '1.0.0', type: 'random_forest', status: 'deployed' },
        { name: 'model-b', version: '1.0.0', type: 'lstm', status: 'training' },
      ]);

      const res = await request(app)
        .get('/api/models')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.models).toHaveLength(2);
      expect(res.body.pagination).toHaveProperty('total', 2);
      expect(res.body.pagination).toHaveProperty('page', 1);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await ModelRegistry.create({
          name: `model-${i}`,
          version: '1.0.0',
          type: 'random_forest',
        });
      }

      const res = await request(app)
        .get('/api/models?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.models).toHaveLength(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/models');
      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ====================================================================
  // GET /api/models/:id
  // ====================================================================

  describe('GET /api/models/:id', () => {
    it('should return 200 for existing model', async () => {
      const model = await ModelRegistry.create({
        name: 'compliance-gap-classifier',
        version: '1.0.0',
        type: 'random_forest',
        accuracy: 0.95,
      });

      const res = await request(app)
        .get(`/api/models/${model.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(model.id);
      expect(res.body.name).toBe('compliance-gap-classifier');
      expect(res.body.accuracy).toBe(0.95);
    });

    it('should return 404 for non-existent model', async () => {
      const res = await request(app)
        .get('/api/models/00000000-0000-0000-0000-000000000099')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // ====================================================================
  // POST /api/models/register
  // ====================================================================

  describe('POST /api/models/register', () => {
    it('should register a new model (201)', async () => {
      const res = await request(app)
        .post('/api/models/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'regulatory-predictor',
          version: '1.0.0',
          type: 'lstm',
          parameters: { hidden_size: 128, num_layers: 2 },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('regulatory-predictor');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.type).toBe('lstm');
      expect(res.body.status).toBe('training');
    });

    it('should return 400 with missing required fields', async () => {
      const res = await request(app)
        .post('/api/models/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'incomplete-model' });

      expect(res.status).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/models/register')
        .send({ name: 'test', version: '1.0.0', type: 'lstm' });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ====================================================================
  // PUT /api/models/:id/status
  // ====================================================================

  describe('PUT /api/models/:id/status', () => {
    it('should update model status (200)', async () => {
      const model = await ModelRegistry.create({
        name: 'test-model',
        version: '1.0.0',
        type: 'random_forest',
        status: 'training',
      });

      const res = await request(app)
        .put(`/api/models/${model.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ready' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });

    it('should set deployedAt when status becomes deployed', async () => {
      const model = await ModelRegistry.create({
        name: 'test-model',
        version: '1.0.0',
        type: 'random_forest',
        status: 'ready',
      });

      const res = await request(app)
        .put(`/api/models/${model.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'deployed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('deployed');
      expect(res.body.deployedAt).toBeDefined();
    });

    it('should return 400 for invalid status value', async () => {
      const model = await ModelRegistry.create({
        name: 'test-model',
        version: '1.0.0',
        type: 'random_forest',
      });

      const res = await request(app)
        .put(`/api/models/${model.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent model', async () => {
      const res = await request(app)
        .put('/api/models/00000000-0000-0000-0000-000000000099/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ready' });

      expect(res.status).toBe(404);
    });
  });

  // ====================================================================
  // GET /api/models/:id/metrics
  // ====================================================================

  describe('GET /api/models/:id/metrics', () => {
    it('should return 200 with model metrics', async () => {
      const metrics = { loss: 0.05, f1: 0.93, precision: 0.94, recall: 0.92 };
      const model = await ModelRegistry.create({
        name: 'test-model',
        version: '1.0.0',
        type: 'random_forest',
        accuracy: 0.95,
        metrics,
      });

      const res = await request(app)
        .get(`/api/models/${model.id}/metrics`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.accuracy).toBe(0.95);
      expect(res.body.metrics).toEqual(metrics);
    });

    it('should return 404 for non-existent model', async () => {
      const res = await request(app)
        .get('/api/models/00000000-0000-0000-0000-000000000099/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/models/some-id/metrics');
      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });
});
