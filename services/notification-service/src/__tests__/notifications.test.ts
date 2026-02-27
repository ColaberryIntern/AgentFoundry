import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize, Notification, initModels } from '../models';

const JWT_SECRET = 'test-jwt-secret-for-notifications';

function makeToken(userId: string): string {
  return jwt.sign({ userId, email: 'test@example.com', role: 'user' }, JWT_SECRET);
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
  await initModels();
});

afterEach(async () => {
  await Notification.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

const userId = '550e8400-e29b-41d4-a716-446655440000';
const otherUserId = '660e8400-e29b-41d4-a716-446655440001';

describe('GET /api/notifications', () => {
  it('returns 200 with user notifications sorted newest first', async () => {
    // Create two notifications with a slight delay between them
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const n1 = await Notification.create({
      userId,
      type: 'system',
      title: 'First',
      message: 'First msg',
    });
    // Ensure different createdAt by small delay
    await new Promise((r) => setTimeout(r, 50));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const n2 = await Notification.create({
      userId,
      type: 'system',
      title: 'Second',
      message: 'Second msg',
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // Newest first
    expect(res.body.data[0].title).toBe('Second');
    expect(res.body.data[1].title).toBe('First');
  });

  it('supports pagination', async () => {
    // Create 3 notifications
    for (let i = 1; i <= 3; i++) {
      await Notification.create({
        userId,
        type: 'system',
        title: `Notification ${i}`,
        message: `Message ${i}`,
      });
      await new Promise((r) => setTimeout(r, 20));
    }

    const res = await request(app)
      .get('/api/notifications?page=1&limit=2')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('supports unreadOnly filter', async () => {
    await Notification.create({
      userId,
      type: 'system',
      title: 'Read',
      message: 'Already read',
      isRead: true,
    });
    await Notification.create({
      userId,
      type: 'system',
      title: 'Unread',
      message: 'Not read yet',
    });

    const res = await request(app)
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Unread');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/notifications/unread-count', () => {
  it('returns correct unread count', async () => {
    await Notification.create({
      userId,
      type: 'system',
      title: 'Read',
      message: 'msg',
      isRead: true,
    });
    await Notification.create({
      userId,
      type: 'system',
      title: 'Unread 1',
      message: 'msg',
    });
    await Notification.create({
      userId,
      type: 'system',
      title: 'Unread 2',
      message: 'msg',
    });

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/notifications/:id/read', () => {
  it('marks a notification as read', async () => {
    const n = await Notification.create({
      userId,
      type: 'system',
      title: 'Test',
      message: 'msg',
    });

    const res = await request(app)
      .put(`/api/notifications/${n.id}/read`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);

    // Verify in DB
    const updated = await Notification.findByPk(n.id);
    expect(updated!.isRead).toBe(true);
  });

  it('returns 404 for non-existent notification', async () => {
    const res = await request(app)
      .put('/api/notifications/00000000-0000-0000-0000-000000000000/read')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it("returns 403 for another user's notification", async () => {
    const n = await Notification.create({
      userId: otherUserId,
      type: 'system',
      title: 'Other user',
      message: 'msg',
    });

    const res = await request(app)
      .put(`/api/notifications/${n.id}/read`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).put('/api/notifications/some-id/read');

    expect(res.status).toBe(401);
  });

  it('is idempotent — marking already-read notification returns 200', async () => {
    const n = await Notification.create({
      userId,
      type: 'system',
      title: 'Test',
      message: 'msg',
      isRead: true,
    });

    const res = await request(app)
      .put(`/api/notifications/${n.id}/read`)
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });
});

describe('PUT /api/notifications/read-all', () => {
  it('marks all unread notifications as read and returns count', async () => {
    await Notification.create({ userId, type: 'system', title: 'A', message: 'msg' });
    await Notification.create({ userId, type: 'system', title: 'B', message: 'msg' });
    await Notification.create({ userId, type: 'system', title: 'C', message: 'msg', isRead: true });

    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);

    // Verify all are now read
    const unread = await Notification.count({ where: { userId, isRead: false } });
    expect(unread).toBe(0);
  });

  it('returns 0 updated when no unread notifications exist', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${makeToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(0);
  });
});

describe('POST /api/notifications', () => {
  it('creates a notification and returns 201', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({
        userId,
        type: 'compliance_alert',
        title: 'Alert',
        message: 'Compliance issue detected',
        metadata: { recordId: 'cr-1' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(userId);
    expect(res.body.data.type).toBe('compliance_alert');
    expect(res.body.data.title).toBe('Alert');
    expect(res.body.data.isRead).toBe(false);
    expect(res.body.data.metadata).toEqual({ recordId: 'cr-1' });
  });

  it('returns 400 with missing required fields', async () => {
    const res = await request(app).post('/api/notifications').send({ userId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
