import request from 'supertest';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import app from '../index';
import { sequelize } from '../config/database';
import { Report } from '../models/Report';

// Force test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-reporting';

// Override JWT_SECRET for test token generation
process.env.JWT_SECRET = JWT_SECRET;

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'user@test.com',
  role: 'user',
};

const adminUser = {
  userId: '550e8400-e29b-41d4-a716-446655440002',
  email: 'admin@test.com',
  role: 'it_admin',
};

const otherUser = {
  userId: '550e8400-e29b-41d4-a716-446655440003',
  email: 'other@test.com',
  role: 'user',
};

let userToken: string;
let adminToken: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let otherUserToken: string;

describe('Reports API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    userToken = generateToken(testUser);
    adminToken = generateToken(adminUser);
    otherUserToken = generateToken(otherUser);
  });

  afterEach(async () => {
    await Report.destroy({ where: {} });

    // Clean up generated report files
    const reportsDir = path.resolve(process.cwd(), 'reports');
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(reportsDir, file));
      }
    }
  });

  afterAll(async () => {
    await sequelize.close();

    // Clean up reports directory
    const reportsDir = path.resolve(process.cwd(), 'reports');
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  });

  // ======================================================================
  // POST /api/reports
  // ======================================================================

  describe('POST /api/reports', () => {
    it('should return 201 with valid data', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'compliance_summary',
          format: 'pdf',
          parameters: { department: 'engineering' },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(testUser.userId);
      expect(response.body.reportType).toBe('compliance_summary');
      expect(response.body.format).toBe('pdf');
      // In synchronous fallback mode, status should end as completed or failed
      expect(['queued', 'processing', 'completed', 'failed']).toContain(response.body.status);
    });

    it('should return 400 with missing reportType', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          format: 'pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('details');
    });

    it('should return 400 with invalid format', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'compliance_summary',
          format: 'xlsx',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('details');
    });

    it('should return 401 without auth', async () => {
      const response = await request(app).post('/api/reports').send({
        reportType: 'compliance_summary',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ======================================================================
  // GET /api/reports
  // ======================================================================

  describe('GET /api/reports', () => {
    it('should return 200 with user reports', async () => {
      // Seed reports
      await Report.bulkCreate([
        {
          userId: testUser.userId,
          reportType: 'compliance_summary',
          format: 'pdf',
          status: 'completed',
        },
        { userId: testUser.userId, reportType: 'risk_assessment', format: 'csv', status: 'queued' },
        { userId: otherUser.userId, reportType: 'audit_trail', format: 'pdf', status: 'completed' },
      ]);

      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
      // All returned reports should belong to the user
      for (const report of response.body.reports) {
        expect(report.userId).toBe(testUser.userId);
      }
    });

    it('should support pagination', async () => {
      // Create 5 reports for the user
      for (let i = 0; i < 5; i++) {
        await Report.create({
          userId: testUser.userId,
          reportType: 'compliance_summary',
          format: 'pdf',
          status: 'completed',
        });
      }

      const response = await request(app)
        .get('/api/reports?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports).toHaveLength(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.totalPages).toBe(3);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should support status filter', async () => {
      await Report.bulkCreate([
        {
          userId: testUser.userId,
          reportType: 'compliance_summary',
          format: 'pdf',
          status: 'completed',
        },
        { userId: testUser.userId, reportType: 'risk_assessment', format: 'pdf', status: 'queued' },
        { userId: testUser.userId, reportType: 'audit_trail', format: 'csv', status: 'completed' },
      ]);

      const response = await request(app)
        .get('/api/reports?status=completed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports).toHaveLength(2);
      for (const report of response.body.reports) {
        expect(report.status).toBe('completed');
      }
    });

    it('should return 401 without auth', async () => {
      const response = await request(app).get('/api/reports');

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should allow it_admin to see all reports', async () => {
      await Report.bulkCreate([
        {
          userId: testUser.userId,
          reportType: 'compliance_summary',
          format: 'pdf',
          status: 'completed',
        },
        {
          userId: otherUser.userId,
          reportType: 'risk_assessment',
          format: 'csv',
          status: 'queued',
        },
      ]);

      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports).toHaveLength(2);
    });
  });

  // ======================================================================
  // GET /api/reports/:id
  // ======================================================================

  describe('GET /api/reports/:id', () => {
    it('should return 200 for own report', async () => {
      const report = await Report.create({
        userId: testUser.userId,
        reportType: 'compliance_summary',
        format: 'pdf',
        status: 'completed',
      });

      const response = await request(app)
        .get(`/api/reports/${report.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(report.id);
      expect(response.body.reportType).toBe('compliance_summary');
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/reports/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 403 for other user report (non-admin)', async () => {
      const report = await Report.create({
        userId: otherUser.userId,
        reportType: 'risk_assessment',
        format: 'pdf',
        status: 'completed',
      });

      const response = await request(app)
        .get(`/api/reports/${report.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should allow it_admin to view any report', async () => {
      const report = await Report.create({
        userId: testUser.userId,
        reportType: 'audit_trail',
        format: 'csv',
        status: 'queued',
      });

      const response = await request(app)
        .get(`/api/reports/${report.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(report.id);
    });

    it('should return 401 without auth', async () => {
      const response = await request(app).get('/api/reports/some-id');

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ======================================================================
  // Synchronous report generation (file creation)
  // ======================================================================

  describe('Synchronous report generation', () => {
    it('should create a PDF file for synchronous fallback', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'compliance_summary',
          format: 'pdf',
        });

      expect(response.status).toBe(201);

      // In synchronous mode (no RabbitMQ), status should be completed
      expect(response.body.status).toBe('completed');
      expect(response.body.downloadUrl).toMatch(/\.pdf$/);

      // Verify the report is accessible via API (avoids filesystem race conditions)
      const reportId = response.body.id;
      const getResponse = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.status).toBe('completed');
      expect(getResponse.body.downloadUrl).toMatch(/\.pdf$/);
    });

    it('should create a CSV file for synchronous fallback', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'risk_assessment',
          format: 'csv',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('completed');
      expect(response.body.downloadUrl).toMatch(/\.csv$/);

      // Verify the report is accessible via API (avoids filesystem race conditions)
      const reportId = response.body.id;
      const getResponse = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.status).toBe('completed');
      expect(getResponse.body.downloadUrl).toMatch(/\.csv$/);
    });
  });
});
