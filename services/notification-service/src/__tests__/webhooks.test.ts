import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize, Webhook, WebhookLog, initModels } from '../models';

const JWT_SECRET = 'test-jwt-secret-for-webhooks';

function makeToken(userId: string): string {
  return jwt.sign({ userId, email: 'test@example.com', role: 'user' }, JWT_SECRET);
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
  await initModels();
});

afterEach(async () => {
  await WebhookLog.destroy({ where: {} });
  await Webhook.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

const userId = '550e8400-e29b-41d4-a716-446655440000';
const otherUserId = '660e8400-e29b-41d4-a716-446655440001';

describe('POST /api/webhooks', () => {
  it('returns 201 and creates webhook with generated secret', async () => {
    const res = await request(app)
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        url: 'https://example.com/webhook',
        events: ['compliance.check.completed'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.url).toBe('https://example.com/webhook');
    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.secret).toHaveLength(64); // 32 bytes hex = 64 chars
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.failureCount).toBe(0);
  });

  it('returns 201 with events array stored correctly', async () => {
    const events = ['compliance.check.completed', 'report.generated', 'agent.deployed'];
    const res = await request(app)
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        url: 'https://example.com/webhook',
        events,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.events).toEqual(events);
  });

  it('returns 400 with invalid URL', async () => {
    const res = await request(app)
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        url: 'not-a-valid-url',
        events: ['compliance.check.completed'],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 with SSRF URL (private IP)', async () => {
    // Test with a private IP address — passes URL validation but
    // caught by the controller's SSRF prevention check
    const res = await request(app)
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        url: 'http://192.168.1.1/hook',
        events: ['compliance.check.completed'],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/private|internal/i);
  });

  it('returns 400 with empty events array', async () => {
    const res = await request(app)
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        url: 'https://example.com/webhook',
        events: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/webhooks')
      .send({
        url: 'https://example.com/webhook',
        events: ['compliance.check.completed'],
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/webhooks', () => {
  it('returns 200 with user webhooks (secrets masked)', async () => {
    await Webhook.create({
      userId,
      url: 'https://example.com/hook1',
      secret: 'secret-1',
      events: ['compliance.check.completed'],
    });
    await Webhook.create({
      userId,
      url: 'https://example.com/hook2',
      secret: 'secret-2',
      events: ['report.generated'],
    });

    const res = await request(app)
      .get('/api/webhooks')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Secrets should be excluded from list response
    res.body.data.forEach((wh: any) => {
      expect(wh.secret).toBeUndefined();
    });
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(2);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/webhooks');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/webhooks/:id', () => {
  it('returns 200 with webhook including secret', async () => {
    const wh = await Webhook.create({
      userId,
      url: 'https://example.com/hook',
      secret: 'my-secret-key',
      events: ['compliance.check.completed'],
    });

    const res = await request(app)
      .get(`/api/webhooks/${wh.id}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(wh.id);
    expect(res.body.data.secret).toBe('my-secret-key');
  });

  it('returns 404 for non-existent webhook', async () => {
    const res = await request(app)
      .get('/api/webhooks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it("returns 403 for another user's webhook", async () => {
    const wh = await Webhook.create({
      userId: otherUserId,
      url: 'https://example.com/hook',
      secret: 'other-secret',
      events: ['compliance.check.completed'],
    });

    const res = await request(app)
      .get(`/api/webhooks/${wh.id}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('PUT /api/webhooks/:id', () => {
  it('returns 200 and updates url and events', async () => {
    const wh = await Webhook.create({
      userId,
      url: 'https://example.com/hook',
      secret: 'secret',
      events: ['compliance.check.completed'],
    });

    const res = await request(app)
      .put(`/api/webhooks/${wh.id}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({
        url: 'https://new-example.com/hook',
        events: ['report.generated', 'agent.deployed'],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe('https://new-example.com/hook');
    expect(res.body.data.events).toEqual(['report.generated', 'agent.deployed']);
  });

  it('returns 200 and toggles isActive', async () => {
    const wh = await Webhook.create({
      userId,
      url: 'https://example.com/hook',
      secret: 'secret',
      events: ['compliance.check.completed'],
    });

    const res = await request(app)
      .put(`/api/webhooks/${wh.id}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    // Toggle back
    const res2 = await request(app)
      .put(`/api/webhooks/${wh.id}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ isActive: true });

    expect(res2.status).toBe(200);
    expect(res2.body.data.isActive).toBe(true);
  });
});

describe('DELETE /api/webhooks/:id', () => {
  it('returns 200 and deletes webhook', async () => {
    const wh = await Webhook.create({
      userId,
      url: 'https://example.com/hook',
      secret: 'secret',
      events: ['compliance.check.completed'],
    });

    const res = await request(app)
      .delete(`/api/webhooks/${wh.id}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    // Verify deletion
    const found = await Webhook.findByPk(wh.id);
    expect(found).toBeNull();
  });

  it("returns 403 for another user's webhook", async () => {
    const wh = await Webhook.create({
      userId: otherUserId,
      url: 'https://example.com/hook',
      secret: 'secret',
      events: ['compliance.check.completed'],
    });

    const res = await request(app)
      .delete(`/api/webhooks/${wh.id}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/webhooks/:id/logs', () => {
  it('returns 200 with delivery logs', async () => {
    const wh = await Webhook.create({
      userId,
      url: 'https://example.com/hook',
      secret: 'secret',
      events: ['compliance.check.completed'],
    });

    await WebhookLog.create({
      webhookId: wh.id,
      eventType: 'compliance.check.completed',
      payload: { event: 'compliance.check.completed', data: {} },
      responseStatus: 200,
      responseBody: 'OK',
      success: true,
      attempt: 1,
      duration: 150,
    });

    await WebhookLog.create({
      webhookId: wh.id,
      eventType: 'compliance.check.completed',
      payload: { event: 'compliance.check.completed', data: {} },
      responseStatus: 500,
      responseBody: 'Internal Server Error',
      success: false,
      attempt: 1,
      duration: 200,
    });

    const res = await request(app)
      .get(`/api/webhooks/${wh.id}/logs`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('returns empty array when no logs exist', async () => {
    const wh = await Webhook.create({
      userId,
      url: 'https://example.com/hook',
      secret: 'secret',
      events: ['compliance.check.completed'],
    });

    const res = await request(app)
      .get(`/api/webhooks/${wh.id}/logs`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });
});

describe('POST /api/webhooks/:id/test', () => {
  it('returns 200 and creates a log entry (webhook target will fail gracefully)', async () => {
    const wh = await Webhook.create({
      userId,
      url: 'https://nonexistent-test-target.invalid/hook',
      secret: 'secret',
      events: ['compliance.check.completed'],
    });

    const res = await request(app)
      .post(`/api/webhooks/${wh.id}/test`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/test/i);
    expect(res.body.data).toBeDefined();
    // The dispatch will have failed (non-existent host) but a log should exist
    expect(res.body.data.webhookId).toBe(wh.id);
    expect(res.body.data.eventType).toBe('test');
  });
});
