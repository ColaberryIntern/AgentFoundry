/**
 * E2E Integration Tests -- Full Notification Service Journey
 *
 * Tests the complete notification lifecycle in sequential order:
 *   Create notification -> Unread count -> List notifications ->
 *   Mark as read -> Unread count again -> Create multiple ->
 *   Filter unread only -> Mark all as read -> Verify all read ->
 *   Pagination -> Access controls
 *
 * Each test depends on state built up by previous tests.
 * JWT tokens are generated locally to match the service's auth middleware.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize, Notification, initModels } from '../models';

// Ensure test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = 'test-jwt-secret-for-notifications';
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(userId: string, role: string = 'user'): string {
  return jwt.sign({ userId, email: `${role}@example.com`, role }, JWT_SECRET);
}

// Simulated users (UUID-based)
const userId = '550e8400-e29b-41d4-a716-446655440010';
const otherUserId = '550e8400-e29b-41d4-a716-446655440011';

let userToken: string;
let otherUserToken: string;

// Shared state
let firstNotificationId: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let secondNotificationId: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let thirdNotificationId: string;

// ── Lifecycle ───────────────────────────────────────────────────────

beforeAll(async () => {
  await initModels();
  await Notification.destroy({ where: {} });
  userToken = makeToken(userId);
  otherUserToken = makeToken(otherUserId);
});

afterAll(async () => {
  await sequelize.close();
});

// ── Journey ─────────────────────────────────────────────────────────

describe('E2E Notification Journey', () => {
  // ----------------------------------------------------------------
  // Step 1: Unread count starts at zero
  // ----------------------------------------------------------------
  it('Step 1 -- unread count should start at 0', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  // ----------------------------------------------------------------
  // Step 2: Create a compliance alert notification (service-to-service)
  // ----------------------------------------------------------------
  it('Step 2 -- should create a compliance_alert notification', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({
        userId,
        type: 'compliance_alert',
        title: 'GDPR Compliance Issue',
        message: 'Your GDPR compliance check has failed. Please review immediately.',
        metadata: { recordId: 'cr-101', severity: 'high' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(userId);
    expect(res.body.data.type).toBe('compliance_alert');
    expect(res.body.data.title).toBe('GDPR Compliance Issue');
    expect(res.body.data.isRead).toBe(false);
    expect(res.body.data.metadata).toEqual({ recordId: 'cr-101', severity: 'high' });

    firstNotificationId = res.body.data.id;
  });

  // ----------------------------------------------------------------
  // Step 3: Unread count should be 1
  // ----------------------------------------------------------------
  it('Step 3 -- unread count should be 1 after creating notification', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  // ----------------------------------------------------------------
  // Step 4: List notifications (should have 1)
  // ----------------------------------------------------------------
  it('Step 4 -- should list 1 notification', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(firstNotificationId);
    expect(res.body.data[0].isRead).toBe(false);
    expect(res.body.pagination.total).toBe(1);
  });

  // ----------------------------------------------------------------
  // Step 5: Mark the notification as read
  // ----------------------------------------------------------------
  it('Step 5 -- should mark notification as read', async () => {
    const res = await request(app)
      .put(`/api/notifications/${firstNotificationId}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
    expect(res.body.data.id).toBe(firstNotificationId);
  });

  // ----------------------------------------------------------------
  // Step 6: Unread count should be 0
  // ----------------------------------------------------------------
  it('Step 6 -- unread count should be 0 after marking as read', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  // ----------------------------------------------------------------
  // Step 7: Create a report_ready notification
  // ----------------------------------------------------------------
  it('Step 7 -- should create a report_ready notification', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({
        userId,
        type: 'report_ready',
        title: 'Report Generated',
        message: 'Your compliance summary report is ready for download.',
        metadata: { reportId: 'rpt-202' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('report_ready');
    secondNotificationId = res.body.data.id;
  });

  // ----------------------------------------------------------------
  // Step 8: Create a system notification
  // ----------------------------------------------------------------
  it('Step 8 -- should create a system notification', async () => {
    const res = await request(app).post('/api/notifications').send({
      userId,
      type: 'system',
      title: 'Scheduled Maintenance',
      message: 'The system will undergo maintenance tonight at 2:00 AM UTC.',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('system');
    thirdNotificationId = res.body.data.id;
  });

  // ----------------------------------------------------------------
  // Step 9: Create a role_change notification
  // ----------------------------------------------------------------
  it('Step 9 -- should create a role_change notification', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({
        userId,
        type: 'role_change',
        title: 'Role Updated',
        message: 'Your role has been changed from compliance_officer to c_suite.',
        metadata: { oldRole: 'compliance_officer', newRole: 'c_suite' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('role_change');
  });

  // ----------------------------------------------------------------
  // Step 10: Unread count should be 3 (notifications from steps 7, 8, 9)
  // ----------------------------------------------------------------
  it('Step 10 -- unread count should be 3', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  // ----------------------------------------------------------------
  // Step 11: List all notifications (should have 4 total)
  // ----------------------------------------------------------------
  it('Step 11 -- should list all 4 notifications newest first', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.pagination.total).toBe(4);

    // Newest first
    expect(res.body.data[0].type).toBe('role_change');
    // The first notification (read) should be last
    expect(res.body.data[3].id).toBe(firstNotificationId);
    expect(res.body.data[3].isRead).toBe(true);
  });

  // ----------------------------------------------------------------
  // Step 12: Filter unread only
  // ----------------------------------------------------------------
  it('Step 12 -- should filter to unread notifications only', async () => {
    const res = await request(app)
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    for (const n of res.body.data) {
      expect(n.isRead).toBe(false);
    }
  });

  // ----------------------------------------------------------------
  // Step 13: Paginate notifications
  // ----------------------------------------------------------------
  it('Step 13 -- should paginate notifications', async () => {
    const res = await request(app)
      .get('/api/notifications?page=1&limit=2')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(4);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  // ----------------------------------------------------------------
  // Step 14: Page 2 of pagination
  // ----------------------------------------------------------------
  it('Step 14 -- should return remaining notifications on page 2', async () => {
    const res = await request(app)
      .get('/api/notifications?page=2&limit=2')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.page).toBe(2);
  });

  // ----------------------------------------------------------------
  // Step 15: Mark all as read
  // ----------------------------------------------------------------
  it('Step 15 -- should mark all unread notifications as read', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(3); // 3 were unread
  });

  // ----------------------------------------------------------------
  // Step 16: Verify all are now read
  // ----------------------------------------------------------------
  it('Step 16 -- unread count should be 0 after marking all as read', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  // ----------------------------------------------------------------
  // Step 17: Mark-all-as-read is idempotent
  // ----------------------------------------------------------------
  it('Step 17 -- mark-all-as-read should return 0 when nothing to update', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(0);
  });

  // ----------------------------------------------------------------
  // Step 18: Mark-as-read is idempotent
  // ----------------------------------------------------------------
  it('Step 18 -- marking already-read notification should succeed (idempotent)', async () => {
    const res = await request(app)
      .put(`/api/notifications/${firstNotificationId}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });

  // ----------------------------------------------------------------
  // Step 19: Other user cannot mark this user's notification as read
  // ----------------------------------------------------------------
  it('Step 19 -- other user should be forbidden from marking another user notification', async () => {
    const res = await request(app)
      .put(`/api/notifications/${firstNotificationId}/read`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // ----------------------------------------------------------------
  // Step 20: Other user should not see this user's notifications
  // ----------------------------------------------------------------
  it('Step 20 -- other user should have 0 notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  // ----------------------------------------------------------------
  // Step 21: Create notification for the other user
  // ----------------------------------------------------------------
  it('Step 21 -- should create a notification for the other user', async () => {
    const res = await request(app).post('/api/notifications').send({
      userId: otherUserId,
      type: 'system',
      title: 'Welcome',
      message: 'Welcome to the platform!',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(otherUserId);

    // Verify the other user can see it
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].title).toBe('Welcome');
  });

  // ----------------------------------------------------------------
  // Step 22: Validation -- missing required fields
  // ----------------------------------------------------------------
  it('Step 22 -- should reject notification with missing required fields', async () => {
    const res = await request(app).post('/api/notifications').send({ userId });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ----------------------------------------------------------------
  // Step 23: Validation -- invalid notification type
  // ----------------------------------------------------------------
  it('Step 23 -- should reject invalid notification type', async () => {
    const res = await request(app).post('/api/notifications').send({
      userId,
      type: 'invalid_type',
      title: 'Bad',
      message: 'Bad type',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ----------------------------------------------------------------
  // Step 24: Non-existent notification returns 404
  // ----------------------------------------------------------------
  it('Step 24 -- should return 404 for non-existent notification', async () => {
    const res = await request(app)
      .put('/api/notifications/00000000-0000-0000-0000-000000000000/read')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  // ----------------------------------------------------------------
  // Step 25: Unauthenticated access is rejected
  // ----------------------------------------------------------------
  it('Step 25 -- unauthenticated requests should return 401', async () => {
    const listRes = await request(app).get('/api/notifications');
    expect(listRes.status).toBe(401);

    const countRes = await request(app).get('/api/notifications/unread-count');
    expect(countRes.status).toBe(401);

    const markRes = await request(app).put('/api/notifications/read-all');
    expect(markRes.status).toBe(401);
  });
});
