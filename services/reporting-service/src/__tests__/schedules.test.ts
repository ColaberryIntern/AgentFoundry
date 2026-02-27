import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import { ScheduledReport } from '../models/ScheduledReport';
import { ReportTemplate } from '../models/ReportTemplate';

// Force test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-reporting';
process.env.JWT_SECRET = JWT_SECRET;

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'user@test.com',
  role: 'compliance_officer',
};

const otherUser = {
  userId: '550e8400-e29b-41d4-a716-446655440003',
  email: 'other@test.com',
  role: 'compliance_officer',
};

let userToken: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _otherUserToken: string;

describe('Schedules API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    userToken = generateToken(testUser);
    _otherUserToken = generateToken(otherUser);
  });

  afterEach(async () => {
    await ScheduledReport.destroy({ where: {} });
    await ReportTemplate.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ======================================================================
  // POST /api/reports/schedules
  // ======================================================================

  describe('POST /api/reports/schedules', () => {
    it('should create a schedule and return 201', async () => {
      const res = await request(app)
        .post('/api/reports/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'compliance_summary',
          schedule: '0 9 * * 1',
          format: 'pdf',
          parameters: { department: 'engineering' },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe(testUser.userId);
      expect(res.body.reportType).toBe('compliance_summary');
      expect(res.body.schedule).toBe('0 9 * * 1');
      expect(res.body.format).toBe('pdf');
      expect(res.body.isActive).toBe(true);
      expect(res.body.nextRunAt).toBeDefined();
    });

    it('should return 400 with invalid cron expression', async () => {
      const res = await request(app)
        .post('/api/reports/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'compliance_summary',
          schedule: 'not-a-cron',
          format: 'pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 with missing schedule', async () => {
      const res = await request(app)
        .post('/api/reports/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'compliance_summary',
          format: 'pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 with missing reportType', async () => {
      const res = await request(app)
        .post('/api/reports/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          schedule: '0 9 * * 1',
          format: 'pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/reports/schedules').send({
        reportType: 'compliance_summary',
        schedule: '0 9 * * 1',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should accept optional templateId', async () => {
      const template = await ReportTemplate.create({
        userId: testUser.userId,
        name: 'Weekly Compliance',
        reportType: 'compliance_summary',
      });

      const res = await request(app)
        .post('/api/reports/schedules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'compliance_summary',
          templateId: template.id,
          schedule: '0 9 * * 1',
          format: 'pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.templateId).toBe(template.id);
    });
  });

  // ======================================================================
  // GET /api/reports/schedules
  // ======================================================================

  describe('GET /api/reports/schedules', () => {
    it('should list user schedules with 200', async () => {
      await ScheduledReport.create({
        userId: testUser.userId,
        reportType: 'compliance_summary',
        schedule: '0 9 * * 1',
      });

      await ScheduledReport.create({
        userId: testUser.userId,
        reportType: 'risk_assessment',
        schedule: '0 8 * * *',
      });

      // Other user's schedule should not appear
      await ScheduledReport.create({
        userId: otherUser.userId,
        reportType: 'audit_trail',
        schedule: '0 17 * * 5',
      });

      const res = await request(app)
        .get('/api/reports/schedules')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.schedules).toHaveLength(2);
      expect(res.body.pagination).toHaveProperty('total', 2);
      for (const schedule of res.body.schedules) {
        expect(schedule.userId).toBe(testUser.userId);
      }
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await ScheduledReport.create({
          userId: testUser.userId,
          reportType: 'compliance_summary',
          schedule: `${i} 9 * * 1`,
        });
      }

      const res = await request(app)
        .get('/api/reports/schedules?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.schedules).toHaveLength(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/reports/schedules');

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ======================================================================
  // GET /api/reports/schedules/:id
  // ======================================================================

  describe('GET /api/reports/schedules/:id', () => {
    it('should return 200 for own schedule', async () => {
      const schedule = await ScheduledReport.create({
        userId: testUser.userId,
        reportType: 'compliance_summary',
        schedule: '0 9 * * 1',
      });

      const res = await request(app)
        .get(`/api/reports/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(schedule.id);
      expect(res.body.schedule).toBe('0 9 * * 1');
    });

    it('should return 404 for non-existent schedule', async () => {
      const res = await request(app)
        .get('/api/reports/schedules/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 403 for other user schedule', async () => {
      const schedule = await ScheduledReport.create({
        userId: otherUser.userId,
        reportType: 'risk_assessment',
        schedule: '0 8 * * *',
      });

      const res = await request(app)
        .get(`/api/reports/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });
  });

  // ======================================================================
  // PUT /api/reports/schedules/:id
  // ======================================================================

  describe('PUT /api/reports/schedules/:id', () => {
    it('should update own schedule and return 200', async () => {
      const schedule = await ScheduledReport.create({
        userId: testUser.userId,
        reportType: 'compliance_summary',
        schedule: '0 9 * * 1',
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/reports/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          schedule: '0 10 * * 2',
          isActive: false,
          format: 'csv',
        });

      expect(res.status).toBe(200);
      expect(res.body.schedule).toBe('0 10 * * 2');
      expect(res.body.isActive).toBe(false);
      expect(res.body.format).toBe('csv');
    });

    it('should return 403 for other user schedule', async () => {
      const schedule = await ScheduledReport.create({
        userId: otherUser.userId,
        reportType: 'risk_assessment',
        schedule: '0 8 * * *',
      });

      const res = await request(app)
        .put(`/api/reports/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should return 404 for non-existent schedule', async () => {
      const res = await request(app)
        .put('/api/reports/schedules/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 400 for invalid cron on update', async () => {
      const schedule = await ScheduledReport.create({
        userId: testUser.userId,
        reportType: 'compliance_summary',
        schedule: '0 9 * * 1',
      });

      const res = await request(app)
        .put(`/api/reports/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ schedule: 'bad-cron' });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  // ======================================================================
  // DELETE /api/reports/schedules/:id
  // ======================================================================

  describe('DELETE /api/reports/schedules/:id', () => {
    it('should delete own schedule and return 200', async () => {
      const schedule = await ScheduledReport.create({
        userId: testUser.userId,
        reportType: 'compliance_summary',
        schedule: '0 9 * * 1',
      });

      const res = await request(app)
        .delete(`/api/reports/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');

      const found = await ScheduledReport.findByPk(schedule.id);
      expect(found).toBeNull();
    });

    it('should return 403 for other user schedule', async () => {
      const schedule = await ScheduledReport.create({
        userId: otherUser.userId,
        reportType: 'risk_assessment',
        schedule: '0 8 * * *',
      });

      const res = await request(app)
        .delete(`/api/reports/schedules/${schedule.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should return 404 for non-existent schedule', async () => {
      const res = await request(app)
        .delete('/api/reports/schedules/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});
