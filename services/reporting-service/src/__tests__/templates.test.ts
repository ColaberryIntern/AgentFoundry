import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
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

describe('Templates API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    userToken = generateToken(testUser);
    _otherUserToken = generateToken(otherUser);
  });

  afterEach(async () => {
    await ReportTemplate.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // ======================================================================
  // POST /api/reports/templates
  // ======================================================================

  describe('POST /api/reports/templates', () => {
    it('should create a template and return 201', async () => {
      const res = await request(app)
        .post('/api/reports/templates')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Monthly Compliance',
          reportType: 'compliance_summary',
          description: 'Monthly compliance overview',
          defaultParameters: { department: 'engineering' },
          sections: [{ type: 'summary', title: 'Executive Summary' }],
          isPublic: false,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Monthly Compliance');
      expect(res.body.reportType).toBe('compliance_summary');
      expect(res.body.userId).toBe(testUser.userId);
      expect(res.body.isPublic).toBe(false);
    });

    it('should return 400 with missing name', async () => {
      const res = await request(app)
        .post('/api/reports/templates')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportType: 'compliance_summary',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 with invalid reportType', async () => {
      const res = await request(app)
        .post('/api/reports/templates')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Bad Template',
          reportType: 'invalid_type',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/reports/templates').send({
        name: 'No Auth Template',
        reportType: 'compliance_summary',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ======================================================================
  // GET /api/reports/templates
  // ======================================================================

  describe('GET /api/reports/templates', () => {
    it('should list own templates and public templates', async () => {
      // Create own private template
      await ReportTemplate.create({
        userId: testUser.userId,
        name: 'My Private Template',
        reportType: 'compliance_summary',
        isPublic: false,
      });

      // Create other user's public template
      await ReportTemplate.create({
        userId: otherUser.userId,
        name: 'Shared Public Template',
        reportType: 'risk_assessment',
        isPublic: true,
      });

      // Create other user's private template (should NOT be visible)
      await ReportTemplate.create({
        userId: otherUser.userId,
        name: 'Other Private Template',
        reportType: 'audit_trail',
        isPublic: false,
      });

      const res = await request(app)
        .get('/api/reports/templates')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(2); // own private + other public
      expect(res.body.pagination).toHaveProperty('total', 2);

      const names = res.body.templates.map((t: any) => t.name);
      expect(names).toContain('My Private Template');
      expect(names).toContain('Shared Public Template');
      expect(names).not.toContain('Other Private Template');
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await ReportTemplate.create({
          userId: testUser.userId,
          name: `Template ${i}`,
          reportType: 'compliance_summary',
        });
      }

      const res = await request(app)
        .get('/api/reports/templates?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/reports/templates');

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });
  });

  // ======================================================================
  // GET /api/reports/templates/:id
  // ======================================================================

  describe('GET /api/reports/templates/:id', () => {
    it('should return 200 for own template', async () => {
      const template = await ReportTemplate.create({
        userId: testUser.userId,
        name: 'My Template',
        reportType: 'compliance_summary',
      });

      const res = await request(app)
        .get(`/api/reports/templates/${template.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(template.id);
      expect(res.body.name).toBe('My Template');
    });

    it('should return 200 for public template owned by another user', async () => {
      const template = await ReportTemplate.create({
        userId: otherUser.userId,
        name: 'Public Template',
        reportType: 'risk_assessment',
        isPublic: true,
      });

      const res = await request(app)
        .get(`/api/reports/templates/${template.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(template.id);
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .get('/api/reports/templates/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 403 for other user private template', async () => {
      const template = await ReportTemplate.create({
        userId: otherUser.userId,
        name: 'Private Template',
        reportType: 'audit_trail',
        isPublic: false,
      });

      const res = await request(app)
        .get(`/api/reports/templates/${template.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });
  });

  // ======================================================================
  // PUT /api/reports/templates/:id
  // ======================================================================

  describe('PUT /api/reports/templates/:id', () => {
    it('should update own template and return 200', async () => {
      const template = await ReportTemplate.create({
        userId: testUser.userId,
        name: 'Original Name',
        reportType: 'compliance_summary',
      });

      const res = await request(app)
        .put(`/api/reports/templates/${template.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          isPublic: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.description).toBe('Updated description');
      expect(res.body.isPublic).toBe(true);
    });

    it('should return 403 for other user template', async () => {
      const template = await ReportTemplate.create({
        userId: otherUser.userId,
        name: 'Other Template',
        reportType: 'risk_assessment',
      });

      const res = await request(app)
        .put(`/api/reports/templates/${template.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hijacked Name' });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .put('/api/reports/templates/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  // ======================================================================
  // DELETE /api/reports/templates/:id
  // ======================================================================

  describe('DELETE /api/reports/templates/:id', () => {
    it('should delete own template and return 200', async () => {
      const template = await ReportTemplate.create({
        userId: testUser.userId,
        name: 'To Delete',
        reportType: 'compliance_summary',
      });

      const res = await request(app)
        .delete(`/api/reports/templates/${template.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');

      // Verify deletion
      const found = await ReportTemplate.findByPk(template.id);
      expect(found).toBeNull();
    });

    it('should return 403 for other user template', async () => {
      const template = await ReportTemplate.create({
        userId: otherUser.userId,
        name: 'Other To Delete',
        reportType: 'risk_assessment',
      });

      const res = await request(app)
        .delete(`/api/reports/templates/${template.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .delete('/api/reports/templates/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});
