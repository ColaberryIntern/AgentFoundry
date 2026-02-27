// Set environment before importing anything
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

import request from 'supertest';
import { app } from '../index';
import { sequelize, initModels } from '../models';

beforeAll(async () => {
  await initModels();
});

afterAll(async () => {
  await sequelize.close();
});

// ---------------------------------------------------------------------------
// Sprint 13: AI Recommendation Service proxy routes
//
// These tests verify that the API Gateway has registered proxy routes for the
// AI Recommendation Service. Since the downstream AI service is not running
// during tests, the proxy middleware will fail to connect and return a 500 or
// 502 status. The key assertion is that the routes do NOT return 404, proving
// they are correctly registered in the gateway.
// ---------------------------------------------------------------------------

describe('AI Recommendation Service proxy routes', () => {
  it('proxies /api/recommendations (not 404)', async () => {
    const res = await request(app).get('/api/recommendations');

    // The route exists (proxy registered) — but target service is down,
    // so expect a gateway/proxy error, NOT a 404.
    expect(res.status).not.toBe(404);
  });

  it('proxies /api/inference (not 404)', async () => {
    const res = await request(app).get('/api/inference');

    expect(res.status).not.toBe(404);
  });

  it('proxies /api/models (not 404)', async () => {
    const res = await request(app).get('/api/models');

    expect(res.status).not.toBe(404);
  });

  it('proxies POST /api/recommendations (not 404)', async () => {
    const res = await request(app).post('/api/recommendations').send({ userId: 1 });

    expect(res.status).not.toBe(404);
  });

  it('proxies POST /api/inference (not 404)', async () => {
    const res = await request(app)
      .post('/api/inference/compliance-gaps')
      .send({ complianceData: [] });

    expect(res.status).not.toBe(404);
  });

  it('proxies GET /api/models with sub-path (not 404)', async () => {
    const res = await request(app).get('/api/models/some-model');

    expect(res.status).not.toBe(404);
  });
});
