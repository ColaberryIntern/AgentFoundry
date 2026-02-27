import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';

const JWT_SECRET = 'test-jwt-secret-for-dashboard-events';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
});

function makeToken(userId: string): string {
  return jwt.sign({ userId, email: 'test@test.com', role: 'it_admin' }, JWT_SECRET);
}

const userId = '550e8400-e29b-41d4-a716-446655440000';

describe('POST /api/dashboard-events/metrics', () => {
  it('returns 200 on valid metrics broadcast', async () => {
    const res = await request(app)
      .post('/api/dashboard-events/metrics')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        complianceRate: 0.95,
        openIssues: 3,
        alertsCount: 7,
        lastChecked: '2026-02-27T10:00:00Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.channel).toBe('metrics');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/dashboard-events/metrics').send({
      complianceRate: 0.95,
      openIssues: 3,
      alertsCount: 7,
      lastChecked: '2026-02-27T10:00:00Z',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 with invalid payload (missing required fields)', async () => {
    const res = await request(app)
      .post('/api/dashboard-events/metrics')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/dashboard-events/activity', () => {
  it('returns 200 on valid activity broadcast', async () => {
    const res = await request(app)
      .post('/api/dashboard-events/activity')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        id: 'act-1',
        complianceType: 'audit',
        status: 'completed',
        regulationId: 'reg-123',
        timestamp: '2026-02-27T10:00:00Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.channel).toBe('activity');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/dashboard-events/activity').send({
      id: 'act-1',
      complianceType: 'audit',
      status: 'completed',
      regulationId: 'reg-123',
      timestamp: '2026-02-27T10:00:00Z',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 with invalid payload (missing required fields)', async () => {
    const res = await request(app)
      .post('/api/dashboard-events/activity')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ id: 'act-1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/dashboard-events/compliance', () => {
  it('returns 200 on valid compliance broadcast', async () => {
    const res = await request(app)
      .post('/api/dashboard-events/compliance')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        status: 'non_compliant',
        regulationId: 'reg-456',
        details: 'Missing documentation',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.channel).toBe('compliance');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/dashboard-events/compliance').send({
      status: 'non_compliant',
      regulationId: 'reg-456',
      details: 'Missing documentation',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 with invalid payload (missing required fields)', async () => {
    const res = await request(app)
      .post('/api/dashboard-events/compliance')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ status: 'compliant' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
