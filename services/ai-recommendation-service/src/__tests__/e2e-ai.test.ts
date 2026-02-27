/**
 * E2E Integration Tests -- Full AI Recommendation Service Journey
 *
 * Tests the complete lifecycle in sequential order:
 *   1. Register a model
 *   2. Update model status to 'ready' then 'deployed'
 *   3. Check model metrics
 *   4. List models
 *   5. Create recommendations directly
 *   6. List recommendations with filters
 *   7. Submit feedback (accept)
 *   8. Submit feedback (dismiss)
 *   9. Verify recommendation status changes
 *  10. Check inference health
 *
 * Each test depends on state built up by previous tests.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import { Recommendation } from '../models/Recommendation';

// Ensure test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
process.env.JWT_SECRET = JWT_SECRET;

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const adminUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'admin@test.com',
  role: 'it_admin',
};

let adminToken: string;

// Shared state across sequential steps
let modelId: string;
let recActiveId: string;
let recToDismissId: string;

// ── Lifecycle ───────────────────────────────────────────────────────

beforeAll(async () => {
  require('../models');
  await sequelize.sync({ force: true });
  adminToken = generateToken(adminUser);
});

afterAll(async () => {
  await sequelize.close();
});

// ── Journey ─────────────────────────────────────────────────────────

describe('E2E AI Recommendation Journey', () => {
  // ----------------------------------------------------------------
  // Step 1: Register a model
  // ----------------------------------------------------------------
  it('Step 1 -- should register a new model', async () => {
    const res = await request(app)
      .post('/api/models/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'compliance-gap-classifier',
        version: '1.0.0',
        type: 'random_forest',
        parameters: { n_estimators: 100, max_depth: 10 },
        metrics: { loss: 0.05, f1: 0.93 },
        accuracy: 0.95,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('compliance-gap-classifier');
    expect(res.body.status).toBe('training');

    modelId = res.body.id;
  });

  // ----------------------------------------------------------------
  // Step 2: Update model status to 'ready' then 'deployed'
  // ----------------------------------------------------------------
  it('Step 2a -- should update model status to ready', async () => {
    const res = await request(app)
      .put(`/api/models/${modelId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ready' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('Step 2b -- should update model status to deployed', async () => {
    const res = await request(app)
      .put(`/api/models/${modelId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'deployed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('deployed');
    expect(res.body.deployedAt).toBeDefined();
  });

  // ----------------------------------------------------------------
  // Step 3: Check model metrics
  // ----------------------------------------------------------------
  it('Step 3 -- should retrieve model metrics', async () => {
    const res = await request(app)
      .get(`/api/models/${modelId}/metrics`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.accuracy).toBe(0.95);
    expect(res.body.metrics).toEqual({ loss: 0.05, f1: 0.93 });
  });

  // ----------------------------------------------------------------
  // Step 4: List models
  // ----------------------------------------------------------------
  it('Step 4 -- should list all registered models', async () => {
    const res = await request(app).get('/api/models').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.models).toHaveLength(1);
    expect(res.body.models[0].name).toBe('compliance-gap-classifier');
    expect(res.body.models[0].status).toBe('deployed');
  });

  // ----------------------------------------------------------------
  // Step 5: Create recommendations directly (via DB seeding since
  //         the inference controller requires the Python server)
  // ----------------------------------------------------------------
  it('Step 5 -- should create recommendations', async () => {
    const recA = await Recommendation.create({
      userId: adminUser.userId,
      type: 'compliance_gap',
      title: 'Missing GDPR consent form',
      description: 'Your application lacks a GDPR consent form for EU users.',
      confidence: 0.92,
      severity: 'high',
      category: 'GDPR',
      modelId,
      modelVersion: '1.0.0',
      status: 'active',
    });

    const recB = await Recommendation.create({
      userId: adminUser.userId,
      type: 'risk_alert',
      title: 'Data retention risk',
      description: 'Retention period exceeds regulatory limit.',
      confidence: 0.78,
      severity: 'medium',
      category: 'HIPAA',
      status: 'active',
    });

    const recC = await Recommendation.create({
      userId: adminUser.userId,
      type: 'optimization',
      title: 'Optimize encryption',
      description: 'Switch to AES-256.',
      confidence: 0.65,
      severity: 'low',
      status: 'active',
    });

    recActiveId = recA.id;
    recToDismissId = recB.id;

    // Verify via API
    const res = await request(app)
      .get(`/api/recommendations/${recC.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Optimize encryption');
  });

  // ----------------------------------------------------------------
  // Step 6: List recommendations with filters
  // ----------------------------------------------------------------
  it('Step 6a -- should list all recommendations', async () => {
    const res = await request(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(3);
    expect(res.body.pagination.total).toBe(3);
  });

  it('Step 6b -- should filter by type', async () => {
    const res = await request(app)
      .get('/api/recommendations?type=compliance_gap')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(1);
    expect(res.body.recommendations[0].type).toBe('compliance_gap');
  });

  it('Step 6c -- should filter by userId', async () => {
    const res = await request(app)
      .get(`/api/recommendations?userId=${adminUser.userId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(3);
  });

  // ----------------------------------------------------------------
  // Step 7: Submit feedback (accept)
  // ----------------------------------------------------------------
  it('Step 7 -- should accept a recommendation', async () => {
    const res = await request(app)
      .post('/api/recommendations/feedback')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recommendationId: recActiveId, action: 'accept' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });

  // ----------------------------------------------------------------
  // Step 8: Submit feedback (dismiss)
  // ----------------------------------------------------------------
  it('Step 8 -- should dismiss a recommendation', async () => {
    const res = await request(app)
      .post('/api/recommendations/feedback')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recommendationId: recToDismissId, action: 'dismiss' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dismissed');
  });

  // ----------------------------------------------------------------
  // Step 9: Verify recommendation status changes persisted
  // ----------------------------------------------------------------
  it('Step 9 -- should verify accepted recommendation status', async () => {
    const res = await request(app)
      .get(`/api/recommendations/${recActiveId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });

  it('Step 9b -- should verify dismissed recommendation status', async () => {
    const res = await request(app)
      .get(`/api/recommendations/${recToDismissId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dismissed');
  });

  // ----------------------------------------------------------------
  // Step 10: Check inference health
  // ----------------------------------------------------------------
  it('Step 10 -- should check inference health (model server offline)', async () => {
    const res = await request(app)
      .get('/api/inference/health')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('modelServer');
    expect(res.body.modelServer).toBe('offline');
  });
});
