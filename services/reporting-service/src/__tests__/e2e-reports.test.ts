/**
 * E2E Integration Tests -- Full Reporting Service Journey
 *
 * Tests the complete report lifecycle in sequential order:
 *   Create PDF report -> Verify completion -> Create CSV report ->
 *   List reports -> Filter by status -> Paginate -> Get single report ->
 *   Verify file generation -> Admin visibility -> Access controls
 *
 * Each test depends on state built up by previous tests.
 * JWT tokens are generated locally to match the service's auth middleware.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import app from '../index';
import { sequelize } from '../config/database';
import '../models/Report';

// Ensure test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-reporting';
process.env.JWT_SECRET = JWT_SECRET;

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Simulated users (UUID-based for this service)
const regularUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'officer@example.com',
  role: 'compliance_officer',
};

const adminUser = {
  userId: '550e8400-e29b-41d4-a716-446655440002',
  email: 'admin@example.com',
  role: 'it_admin',
};

const otherUser = {
  userId: '550e8400-e29b-41d4-a716-446655440003',
  email: 'other@example.com',
  role: 'compliance_officer',
};

let userToken: string;
let adminToken: string;
let otherUserToken: string;

// Shared state
let pdfReportId: string;
let csvReportId: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let adminReportId: string;

// ── Lifecycle ───────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });
  userToken = generateToken(regularUser);
  adminToken = generateToken(adminUser);
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

// ── Journey ─────────────────────────────────────────────────────────

describe('E2E Reporting Journey', () => {
  // ----------------------------------------------------------------
  // Step 1: Create a PDF compliance summary report
  // ----------------------------------------------------------------
  it('Step 1 -- should create a PDF compliance_summary report', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'compliance_summary',
        format: 'pdf',
        parameters: { department: 'engineering', quarter: 'Q4' },
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.userId).toBe(regularUser.userId);
    expect(res.body.reportType).toBe('compliance_summary');
    expect(res.body.format).toBe('pdf');
    // Synchronous fallback (no RabbitMQ) should complete immediately
    expect(res.body.status).toBe('completed');
    expect(res.body.downloadUrl).toMatch(/\.pdf$/);

    pdfReportId = res.body.id;
  });

  // ----------------------------------------------------------------
  // Step 2: Verify PDF report record is completed with downloadUrl
  // ----------------------------------------------------------------
  it('Step 2 -- PDF report should be completed with download URL', async () => {
    const res = await request(app)
      .get(`/api/reports/${pdfReportId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.downloadUrl).toMatch(/\.pdf$/);
    expect(res.body.format).toBe('pdf');
  });

  // ----------------------------------------------------------------
  // Step 3: Create a CSV risk assessment report
  // ----------------------------------------------------------------
  it('Step 3 -- should create a CSV risk_assessment report', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'risk_assessment',
        format: 'csv',
      });

    expect(res.status).toBe(201);
    expect(res.body.reportType).toBe('risk_assessment');
    expect(res.body.format).toBe('csv');
    expect(res.body.status).toBe('completed');
    expect(res.body.downloadUrl).toMatch(/\.csv$/);

    csvReportId = res.body.id;
  });

  // ----------------------------------------------------------------
  // Step 4: Verify CSV report record is completed with downloadUrl
  // ----------------------------------------------------------------
  it('Step 4 -- CSV report should be completed with download URL', async () => {
    const res = await request(app)
      .get(`/api/reports/${csvReportId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.downloadUrl).toMatch(/\.csv$/);
    expect(res.body.format).toBe('csv');
  });

  // ----------------------------------------------------------------
  // Step 5: Admin creates an audit_trail report
  // ----------------------------------------------------------------
  it('Step 5 -- admin should create an audit_trail report', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reportType: 'audit_trail',
        format: 'pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(adminUser.userId);
    expect(res.body.reportType).toBe('audit_trail');

    adminReportId = res.body.id;
  });

  // ----------------------------------------------------------------
  // Step 6: Get single report by ID (own report)
  // ----------------------------------------------------------------
  it('Step 6 -- should retrieve own PDF report by ID', async () => {
    const res = await request(app)
      .get(`/api/reports/${pdfReportId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pdfReportId);
    expect(res.body.reportType).toBe('compliance_summary');
    expect(res.body.format).toBe('pdf');
    expect(res.body.status).toBe('completed');
  });

  // ----------------------------------------------------------------
  // Step 7: List user's reports (should see only own)
  // ----------------------------------------------------------------
  it('Step 7 -- regular user should only see own reports', async () => {
    const res = await request(app).get('/api/reports').set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reports).toHaveLength(2); // PDF + CSV
    expect(res.body.pagination.total).toBe(2);

    for (const report of res.body.reports) {
      expect(report.userId).toBe(regularUser.userId);
    }
  });

  // ----------------------------------------------------------------
  // Step 8: Admin lists all reports across users
  // ----------------------------------------------------------------
  it('Step 8 -- admin should see all reports', async () => {
    const res = await request(app).get('/api/reports').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reports).toHaveLength(3); // 2 user + 1 admin
    expect(res.body.pagination.total).toBe(3);
  });

  // ----------------------------------------------------------------
  // Step 9: Filter reports by status
  // ----------------------------------------------------------------
  it('Step 9 -- should filter reports by status=completed', async () => {
    const res = await request(app)
      .get('/api/reports?status=completed')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    for (const report of res.body.reports) {
      expect(report.status).toBe('completed');
    }
  });

  // ----------------------------------------------------------------
  // Step 10: Paginate reports
  // ----------------------------------------------------------------
  it('Step 10 -- should paginate reports', async () => {
    const res = await request(app)
      .get('/api/reports?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reports).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  // ----------------------------------------------------------------
  // Step 11: Second page of pagination
  // ----------------------------------------------------------------
  it('Step 11 -- should return remaining reports on page 2', async () => {
    const res = await request(app)
      .get('/api/reports?page=2&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reports).toHaveLength(1);
    expect(res.body.pagination.page).toBe(2);
  });

  // ----------------------------------------------------------------
  // Step 12: Other user cannot access regular user's report
  // ----------------------------------------------------------------
  it('Step 12 -- other user should be forbidden from viewing another user report', async () => {
    const res = await request(app)
      .get(`/api/reports/${pdfReportId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // ----------------------------------------------------------------
  // Step 13: Admin can access any user's report
  // ----------------------------------------------------------------
  it('Step 13 -- admin should be able to view any user report', async () => {
    const res = await request(app)
      .get(`/api/reports/${pdfReportId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(pdfReportId);
    expect(res.body.userId).toBe(regularUser.userId);
  });

  // ----------------------------------------------------------------
  // Step 14: Non-existent report returns 404
  // ----------------------------------------------------------------
  it('Step 14 -- should return 404 for non-existent report', async () => {
    const res = await request(app)
      .get('/api/reports/00000000-0000-0000-0000-000000000099')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  // ----------------------------------------------------------------
  // Step 15: Invalid report type is rejected
  // ----------------------------------------------------------------
  it('Step 15 -- should reject invalid reportType', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'invalid_type',
        format: 'pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ----------------------------------------------------------------
  // Step 16: Invalid format is rejected
  // ----------------------------------------------------------------
  it('Step 16 -- should reject invalid format', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'compliance_summary',
        format: 'xlsx',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ----------------------------------------------------------------
  // Step 17: Missing reportType is rejected
  // ----------------------------------------------------------------
  it('Step 17 -- should reject missing reportType', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ format: 'pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ----------------------------------------------------------------
  // Step 18: Unauthenticated access is rejected
  // ----------------------------------------------------------------
  it('Step 18 -- unauthenticated requests should return 401', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .send({ reportType: 'compliance_summary' });
    expect(createRes.status).toBe(401);

    const listRes = await request(app).get('/api/reports');
    expect(listRes.status).toBe(401);
  });

  // ----------------------------------------------------------------
  // Step 19: Default format is pdf when not specified
  // ----------------------------------------------------------------
  it('Step 19 -- should default to pdf format when not specified', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'regulatory_status',
      });

    expect(res.status).toBe(201);
    expect(res.body.format).toBe('pdf');
  });
});
