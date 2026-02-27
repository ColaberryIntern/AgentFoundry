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
// Sprint 21: Agent Management proxy routes
//
// These tests verify that the API Gateway has registered proxy routes for the
// Agent Management endpoints on the Compliance Monitor Service. Since the
// downstream service is not running during tests, the proxy middleware will
// fail to connect and return a 500 or 502 status. The key assertion is that
// the routes do NOT return 404, proving they are correctly registered.
// ---------------------------------------------------------------------------

describe('Agent Management proxy routes', () => {
  it('proxies GET /api/agents (not 404)', async () => {
    const res = await request(app).get('/api/agents');

    // The route exists (proxy registered) — but target service is down,
    // so expect a gateway/proxy error, NOT a 404.
    expect(res.status).not.toBe(404);
  });

  it('proxies POST /api/agents (not 404)', async () => {
    const res = await request(app).post('/api/agents').send({ name: 'Test Agent', type: 'custom' });

    expect(res.status).not.toBe(404);
  });

  it('proxies GET /api/agents/:id (not 404)', async () => {
    const res = await request(app).get('/api/agents/some-agent-id');

    expect(res.status).not.toBe(404);
  });

  it('proxies PUT /api/agents/:id (not 404)', async () => {
    const res = await request(app).put('/api/agents/some-agent-id').send({ name: 'Updated' });

    expect(res.status).not.toBe(404);
  });

  it('proxies POST /api/agents/:id/deploy (not 404)', async () => {
    const res = await request(app).post('/api/agents/some-agent-id/deploy');

    expect(res.status).not.toBe(404);
  });

  it('proxies POST /api/agents/:id/pause (not 404)', async () => {
    const res = await request(app).post('/api/agents/some-agent-id/pause');

    expect(res.status).not.toBe(404);
  });

  it('proxies POST /api/agents/:id/resume (not 404)', async () => {
    const res = await request(app).post('/api/agents/some-agent-id/resume');

    expect(res.status).not.toBe(404);
  });

  it('proxies POST /api/agents/:id/stop (not 404)', async () => {
    const res = await request(app).post('/api/agents/some-agent-id/stop');

    expect(res.status).not.toBe(404);
  });

  it('proxies DELETE /api/agents/:id (not 404)', async () => {
    const res = await request(app).delete('/api/agents/some-agent-id');

    expect(res.status).not.toBe(404);
  });

  it('proxies GET /api/agents/:id/metrics (not 404)', async () => {
    const res = await request(app).get('/api/agents/some-agent-id/metrics');

    expect(res.status).not.toBe(404);
  });

  it('proxies POST /api/agents/:id/optimize (not 404)', async () => {
    const res = await request(app)
      .post('/api/agents/some-agent-id/optimize')
      .send({ constraints: {} });

    expect(res.status).not.toBe(404);
  });
});
