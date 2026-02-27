/**
 * E2E Integration Tests -- Full Compliance Monitor Journey
 *
 * Tests the complete compliance lifecycle in sequential order:
 *   Create monitors -> View user records -> Get summary ->
 *   Update statuses -> Verify summary accuracy -> Dashboard views by role
 *
 * Each test depends on state built up by previous tests.
 * JWT tokens are generated locally to match the service's auth middleware.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import '../models/ComplianceRecord';

// Ensure test environment
process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function generateToken(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Simulated users
const complianceOfficer = { userId: 1, email: 'officer@example.com', role: 'compliance_officer' };
const itAdmin = { userId: 2, email: 'admin@example.com', role: 'it_admin' };
const cSuiteUser = { userId: 3, email: 'ceo@example.com', role: 'c_suite' };

let officerToken: string;
let adminToken: string;
let cSuiteToken: string;

// Shared state
let gdprRecordId: number;
let hipaaRecordId: number;
let soxRecordId: number;
let ccpaRecordId: number;

// ── Lifecycle ───────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });
  officerToken = generateToken(complianceOfficer);
  adminToken = generateToken(itAdmin);
  cSuiteToken = generateToken(cSuiteUser);
});

afterAll(async () => {
  await sequelize.close();
});

// ── Journey ─────────────────────────────────────────────────────────

describe('E2E Compliance Journey', () => {
  // ----------------------------------------------------------------
  // Step 1: Compliance Officer creates a GDPR monitor
  // ----------------------------------------------------------------
  it('Step 1 -- should create a GDPR compliance monitor', async () => {
    const res = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        compliance_type: 'GDPR',
        regulation_id: 'REG-GDPR-001',
        data_source: 'customer_database',
        threshold: 0.95,
      });

    expect(res.status).toBe(201);
    expect(res.body.complianceType).toBe('GDPR');
    expect(res.body.status).toBe('pending');
    expect(res.body.userId).toBe(complianceOfficer.userId);
    expect(res.body.regulationId).toBe('REG-GDPR-001');
    expect(res.body.dataSource).toBe('customer_database');
    expect(res.body.threshold).toBe(0.95);

    gdprRecordId = res.body.id;
  });

  // ----------------------------------------------------------------
  // Step 2: Create additional compliance monitors
  // ----------------------------------------------------------------
  it('Step 2 -- should create HIPAA, SOX, and CCPA monitors', async () => {
    const hipaaRes = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        compliance_type: 'HIPAA',
        regulation_id: 'REG-HIPAA-001',
        data_source: 'health_records',
      });
    expect(hipaaRes.status).toBe(201);
    hipaaRecordId = hipaaRes.body.id;

    const soxRes = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        compliance_type: 'SOX',
        regulation_id: 'REG-SOX-001',
        data_source: 'financial_records',
      });
    expect(soxRes.status).toBe(201);
    soxRecordId = soxRes.body.id;

    // IT Admin also creates a CCPA monitor
    const ccpaRes = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        compliance_type: 'CCPA',
        regulation_id: 'REG-CCPA-001',
        data_source: 'user_consent_db',
        threshold: 0.99,
      });
    expect(ccpaRes.status).toBe(201);
    ccpaRecordId = ccpaRes.body.id;
  });

  // ----------------------------------------------------------------
  // Step 3: Get compliance records for a specific user
  // ----------------------------------------------------------------
  it('Step 3 -- should retrieve compliance records for the officer', async () => {
    const res = await request(app)
      .get(`/api/compliance/${complianceOfficer.userId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('records');
    expect(res.body.total).toBe(3); // GDPR, HIPAA, SOX
    expect(res.body.page).toBe(1);

    const types = res.body.records.map((r: { complianceType: string }) => r.complianceType);
    expect(types).toContain('GDPR');
    expect(types).toContain('HIPAA');
    expect(types).toContain('SOX');
  });

  // ----------------------------------------------------------------
  // Step 4: Get summary -- all should be pending
  // ----------------------------------------------------------------
  it('Step 4 -- summary should show all 4 records as pending', async () => {
    const res = await request(app)
      .get('/api/compliance/summary')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    const { summary } = res.body;
    expect(summary.totalRecords).toBe(4);
    expect(summary.byStatus.pending).toBe(4);
    expect(summary.byStatus.compliant).toBe(0);
    expect(summary.byStatus.non_compliant).toBe(0);
    expect(summary.complianceRate).toBe(0);
  });

  // ----------------------------------------------------------------
  // Step 5: Update GDPR to compliant
  // ----------------------------------------------------------------
  it('Step 5 -- should update GDPR record to compliant', async () => {
    const res = await request(app)
      .put(`/api/compliance/${gdprRecordId}/status`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ status: 'compliant' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('compliant');
    expect(res.body.id).toBe(gdprRecordId);
  });

  // ----------------------------------------------------------------
  // Step 6: Update HIPAA to non_compliant
  // ----------------------------------------------------------------
  it('Step 6 -- should update HIPAA record to non_compliant', async () => {
    const res = await request(app)
      .put(`/api/compliance/${hipaaRecordId}/status`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ status: 'non_compliant' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('non_compliant');
  });

  // ----------------------------------------------------------------
  // Step 7: Update SOX to review
  // ----------------------------------------------------------------
  it('Step 7 -- should update SOX record to review', async () => {
    const res = await request(app)
      .put(`/api/compliance/${soxRecordId}/status`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ status: 'review' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('review');
  });

  // ----------------------------------------------------------------
  // Step 8: Update CCPA to compliant
  // ----------------------------------------------------------------
  it('Step 8 -- should update CCPA record to compliant', async () => {
    const res = await request(app)
      .put(`/api/compliance/${ccpaRecordId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'compliant' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('compliant');
  });

  // ----------------------------------------------------------------
  // Step 9: Verify summary reflects all status changes
  // ----------------------------------------------------------------
  it('Step 9 -- summary should accurately reflect updated statuses', async () => {
    const res = await request(app)
      .get('/api/compliance/summary')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    const { summary } = res.body;
    expect(summary.totalRecords).toBe(4);
    expect(summary.byStatus.compliant).toBe(2); // GDPR + CCPA
    expect(summary.byStatus.non_compliant).toBe(1); // HIPAA
    expect(summary.byStatus.review).toBe(1); // SOX
    expect(summary.byStatus.pending).toBe(0);
    expect(summary.complianceRate).toBe(50); // 2/4 = 50%
  });

  // ----------------------------------------------------------------
  // Step 10: Filter records by status
  // ----------------------------------------------------------------
  it('Step 10 -- should filter officer records by status=compliant', async () => {
    const res = await request(app)
      .get(`/api/compliance/${complianceOfficer.userId}?status=compliant`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1); // Only GDPR (officer's compliant record)
    expect(res.body.records[0].complianceType).toBe('GDPR');
  });

  // ----------------------------------------------------------------
  // Step 11: Filter records by type
  // ----------------------------------------------------------------
  it('Step 11 -- should filter officer records by type=HIPAA', async () => {
    const res = await request(app)
      .get(`/api/compliance/${complianceOfficer.userId}?type=HIPAA`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.records[0].status).toBe('non_compliant');
  });

  // ----------------------------------------------------------------
  // Step 12: Paginate compliance records
  // ----------------------------------------------------------------
  it('Step 12 -- should paginate officer compliance records', async () => {
    const res = await request(app)
      .get(`/api/compliance/${complianceOfficer.userId}?page=1&limit=2`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records.length).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  // ----------------------------------------------------------------
  // Step 13: Dashboard for compliance_officer includes detailedRecords
  // ----------------------------------------------------------------
  it('Step 13 -- dashboard for compliance_officer should include detailedRecords', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    const { dashboard } = res.body;
    expect(dashboard).toHaveProperty('complianceRate');
    expect(dashboard).toHaveProperty('openIssues');
    expect(dashboard).toHaveProperty('alertsCount');
    expect(dashboard).toHaveProperty('recentUpdates');
    expect(dashboard).toHaveProperty('trend');
    expect(dashboard).toHaveProperty('detailedRecords');

    // Verify accuracy
    expect(dashboard.complianceRate).toBe(50);
    expect(dashboard.openIssues).toBe(1); // non_compliant count
    expect(dashboard.alertsCount).toBe(2); // non_compliant + review
  });

  // ----------------------------------------------------------------
  // Step 14: Dashboard for it_admin includes systemStats
  // ----------------------------------------------------------------
  it('Step 14 -- dashboard for it_admin should include systemStats', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { dashboard } = res.body;
    expect(dashboard).toHaveProperty('systemStats');
    expect(dashboard.systemStats).toHaveProperty('totalRecords', 4);
    expect(dashboard.systemStats).toHaveProperty('lastSync');
    expect(dashboard.systemStats).toHaveProperty('uptime');
  });

  // ----------------------------------------------------------------
  // Step 15: Dashboard for c_suite (basic view, no extras)
  // ----------------------------------------------------------------
  it('Step 15 -- dashboard for c_suite should not include detailedRecords or systemStats', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${cSuiteToken}`);

    expect(res.status).toBe(200);
    const { dashboard } = res.body;
    expect(dashboard).toHaveProperty('complianceRate');
    expect(dashboard).not.toHaveProperty('detailedRecords');
    expect(dashboard).not.toHaveProperty('systemStats');
  });

  // ----------------------------------------------------------------
  // Step 16: Summary byType breakdown is accurate
  // ----------------------------------------------------------------
  it('Step 16 -- summary byType should group correctly', async () => {
    const res = await request(app)
      .get('/api/compliance/summary')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    const { byType } = res.body.summary;

    expect(byType.GDPR).toBeDefined();
    expect(byType.GDPR.compliant).toBe(1);

    expect(byType.HIPAA).toBeDefined();
    expect(byType.HIPAA.non_compliant).toBe(1);

    expect(byType.SOX).toBeDefined();
    expect(byType.SOX.review).toBe(1);

    expect(byType.CCPA).toBeDefined();
    expect(byType.CCPA.compliant).toBe(1);
  });

  // ----------------------------------------------------------------
  // Step 17: Invalid status update should be rejected
  // ----------------------------------------------------------------
  it('Step 17 -- should reject invalid status value', async () => {
    const res = await request(app)
      .put(`/api/compliance/${gdprRecordId}/status`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  // ----------------------------------------------------------------
  // Step 18: Unauthenticated access should be rejected
  // ----------------------------------------------------------------
  it('Step 18 -- unauthenticated requests should return 401', async () => {
    const monitorRes = await request(app)
      .post('/api/compliance/monitor')
      .send({ compliance_type: 'GDPR' });
    expect(monitorRes.status).toBe(401);

    const summaryRes = await request(app).get('/api/compliance/summary');
    expect(summaryRes.status).toBe(401);

    const dashboardRes = await request(app).get('/api/dashboard');
    expect(dashboardRes.status).toBe(401);
  });
});
