/**
 * E2E Integration Tests -- Custom Reports & Templates Journey
 *
 * Tests the complete template and schedule lifecycle in sequential order:
 *   1. Create a template
 *   2. Create a report using the template
 *   3. Create a scheduled report using the template
 *   4. List templates (see own + public)
 *   5. Update template
 *   6. Create report with custom filters
 *   7. List schedules
 *   8. Update schedule (pause/resume)
 *   9. Delete schedule
 *  10. Delete template
 *
 * Each test depends on state built up by previous tests.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import app from '../index';
import { sequelize } from '../config/database';
import '../models/Report';
import '../models/ReportTemplate';
import '../models/ScheduledReport';

// Ensure test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-reporting';
process.env.JWT_SECRET = JWT_SECRET;

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const regularUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'officer@example.com',
  role: 'compliance_officer',
};

const otherUser = {
  userId: '550e8400-e29b-41d4-a716-446655440003',
  email: 'other@example.com',
  role: 'compliance_officer',
};

let userToken: string;
let otherUserToken: string;

// Shared state across steps
let templateId: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _reportId: string;
let scheduleId: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _publicTemplateId: string;

// -- Lifecycle ---------------------------------------------------------------

beforeAll(async () => {
  await sequelize.sync({ force: true });
  userToken = generateToken(regularUser);
  otherUserToken = generateToken(otherUser);
});

afterAll(async () => {
  await sequelize.close();

  // Clean up generated report files
  const reportsDir = path.resolve(process.cwd(), 'reports');
  if (fs.existsSync(reportsDir)) {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
});

// -- Journey -----------------------------------------------------------------

describe('E2E Custom Reports Journey', () => {
  // Step 1: Create a template
  it('Step 1 -- should create a report template', async () => {
    const res = await request(app)
      .post('/api/reports/templates')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Weekly Compliance Summary',
        reportType: 'compliance_summary',
        description: 'Weekly compliance overview for engineering',
        defaultParameters: { department: 'engineering', period: 'weekly' },
        sections: [
          { type: 'summary', title: 'Executive Summary' },
          { type: 'chart', chartType: 'bar' },
          { type: 'table', columns: ['item', 'status', 'date'] },
        ],
        isPublic: false,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Weekly Compliance Summary');
    expect(res.body.reportType).toBe('compliance_summary');
    expect(res.body.userId).toBe(regularUser.userId);
    expect(res.body.isPublic).toBe(false);
    expect(res.body.sections).toHaveLength(3);

    templateId = res.body.id;
  });

  // Step 2: Create a report using the template
  it('Step 2 -- should create a report using the template', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'compliance_summary',
        templateId,
        format: 'pdf',
        parameters: { quarter: 'Q1' },
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.reportType).toBe('compliance_summary');
    // Parameters should include merged template defaults + request parameters
    expect(res.body.parameters).toHaveProperty('department', 'engineering');
    expect(res.body.parameters).toHaveProperty('quarter', 'Q1');

    _reportId = res.body.id;
  });

  // Step 3: Create a scheduled report using the template
  it('Step 3 -- should create a scheduled report using the template', async () => {
    const res = await request(app)
      .post('/api/reports/schedules')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'compliance_summary',
        templateId,
        schedule: '0 9 * * 1',
        format: 'pdf',
        parameters: { quarter: 'Q1' },
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.templateId).toBe(templateId);
    expect(res.body.schedule).toBe('0 9 * * 1');
    expect(res.body.isActive).toBe(true);
    expect(res.body.nextRunAt).toBeDefined();

    scheduleId = res.body.id;
  });

  // Step 4: List templates (see own + public)
  it('Step 4 -- should list own templates and public templates', async () => {
    // Create a public template from another user
    const publicRes = await request(app)
      .post('/api/reports/templates')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        name: 'Public Risk Template',
        reportType: 'risk_assessment',
        isPublic: true,
      });
    _publicTemplateId = publicRes.body.id;

    // Create a private template from another user (should not appear)
    await request(app)
      .post('/api/reports/templates')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        name: 'Private Other Template',
        reportType: 'audit_trail',
        isPublic: false,
      });

    const res = await request(app)
      .get('/api/reports/templates')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    // Should see: own template + other user's public template = 2
    expect(res.body.templates).toHaveLength(2);

    const names = res.body.templates.map((t: any) => t.name);
    expect(names).toContain('Weekly Compliance Summary');
    expect(names).toContain('Public Risk Template');
    expect(names).not.toContain('Private Other Template');
  });

  // Step 5: Update template
  it('Step 5 -- should update the template', async () => {
    const res = await request(app)
      .put(`/api/reports/templates/${templateId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Updated Weekly Compliance',
        description: 'Updated description',
        isPublic: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Weekly Compliance');
    expect(res.body.description).toBe('Updated description');
    expect(res.body.isPublic).toBe(true);
  });

  // Step 6: Create report with custom filters
  it('Step 6 -- should create a report with custom filters', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'risk_assessment',
        format: 'csv',
        filters: {
          dateRange: { start: '2026-01-01', end: '2026-03-31' },
          complianceStatus: 'non_compliant',
          regulationIds: ['REG-001', 'REG-002'],
        },
        sections: [{ type: 'table', columns: ['regulation', 'status', 'risk_level'] }],
      });

    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('risk_assessment');
    expect(res.body.format).toBe('csv');
    // Filters should be stored in parameters
    expect(res.body.parameters).toHaveProperty('filters');
    expect(res.body.parameters.filters).toHaveProperty('complianceStatus', 'non_compliant');
  });

  // Step 7: List schedules
  it('Step 7 -- should list user schedules', async () => {
    const res = await request(app)
      .get('/api/reports/schedules')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.schedules).toHaveLength(1);
    expect(res.body.schedules[0].id).toBe(scheduleId);
    expect(res.body.pagination.total).toBe(1);
  });

  // Step 8: Update schedule (pause/resume)
  it('Step 8 -- should pause and resume a schedule', async () => {
    // Pause
    let res = await request(app)
      .put(`/api/reports/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);

    // Resume
    res = await request(app)
      .put(`/api/reports/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ isActive: true });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(true);
  });

  // Step 9: Delete schedule
  it('Step 9 -- should delete the schedule', async () => {
    const res = await request(app)
      .delete(`/api/reports/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Verify deletion
    const listRes = await request(app)
      .get('/api/reports/schedules')
      .set('Authorization', `Bearer ${userToken}`);

    expect(listRes.body.schedules).toHaveLength(0);
  });

  // Step 10: Delete template
  it('Step 10 -- should delete the template', async () => {
    const res = await request(app)
      .delete(`/api/reports/templates/${templateId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Verify deletion
    const getRes = await request(app)
      .get(`/api/reports/templates/${templateId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(404);
  });
});
