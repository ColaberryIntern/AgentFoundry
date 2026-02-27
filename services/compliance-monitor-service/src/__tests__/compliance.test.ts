import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import ComplianceRecord from '../models/ComplianceRecord';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function generateToken(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = { userId: 1, email: 'user@test.com', role: 'user' };
const adminUser = { userId: 2, email: 'admin@test.com', role: 'admin' };
let userToken: string;
let adminToken: string;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  userToken = generateToken(testUser);
  adminToken = generateToken(adminUser);
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await ComplianceRecord.destroy({ where: {} });
});

// ──────────────────────────────────────────────────────────
// Monitor creation
// ──────────────────────────────────────────────────────────

describe('POST /api/compliance/monitor', () => {
  it('should create a compliance monitor with valid data and return 201', async () => {
    const res = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        compliance_type: 'GDPR',
        regulation_id: 'REG-001',
        data_source: 'user_database',
        threshold: 0.95,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.complianceType).toBe('GDPR');
    expect(res.body.status).toBe('pending');
    expect(res.body.userId).toBe(testUser.userId);
    expect(res.body.regulationId).toBe('REG-001');
    expect(res.body.dataSource).toBe('user_database');
    expect(res.body.threshold).toBe(0.95);
    expect(res.body.lastChecked).toBeTruthy();
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).post('/api/compliance/monitor').send({
      compliance_type: 'GDPR',
      regulation_id: 'REG-001',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});

// ──────────────────────────────────────────────────────────
// Get compliance by user
// ──────────────────────────────────────────────────────────

describe('GET /api/compliance/:userId', () => {
  beforeEach(async () => {
    // Seed test data
    await ComplianceRecord.bulkCreate([
      { userId: 1, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'HIPAA', status: 'non_compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'GDPR', status: 'pending', lastChecked: new Date() },
      { userId: 1, complianceType: 'SOX', status: 'compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'CCPA', status: 'review', lastChecked: new Date() },
      { userId: 1, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
      { userId: 2, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
    ]);
  });

  it('should return 200 with records for a given user', async () => {
    const res = await request(app)
      .get('/api/compliance/1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('records');
    expect(res.body).toHaveProperty('total', 6);
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(res.body.records.length).toBe(6);
  });

  it('should filter records by status', async () => {
    const res = await request(app)
      .get('/api/compliance/1?status=compliant')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records.length).toBe(3);
    res.body.records.forEach((record: { status: string }) => {
      expect(record.status).toBe('compliant');
    });
  });

  it('should filter records by type', async () => {
    const res = await request(app)
      .get('/api/compliance/1?type=GDPR')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records.length).toBe(3);
    res.body.records.forEach((record: { complianceType: string }) => {
      expect(record.complianceType).toBe('GDPR');
    });
  });

  it('should paginate results', async () => {
    const res = await request(app)
      .get('/api/compliance/1?page=1&limit=2')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records.length).toBe(2);
    expect(res.body.total).toBe(6);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  it('should return 200 with empty records for non-existent user', async () => {
    const res = await request(app)
      .get('/api/compliance/999')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────

describe('GET /api/compliance/summary', () => {
  beforeEach(async () => {
    await ComplianceRecord.bulkCreate([
      { userId: 1, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'GDPR', status: 'non_compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'HIPAA', status: 'compliant', lastChecked: new Date() },
      { userId: 2, complianceType: 'SOX', status: 'pending', lastChecked: new Date() },
      { userId: 2, complianceType: 'CCPA', status: 'review', lastChecked: new Date() },
    ]);
  });

  it('should return 200 with summary including complianceRate, totalRecords, byStatus, byType, recentUpdates', async () => {
    const res = await request(app)
      .get('/api/compliance/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');

    const { summary } = res.body;
    expect(summary).toHaveProperty('complianceRate');
    expect(summary).toHaveProperty('totalRecords', 5);
    expect(summary).toHaveProperty('byStatus');
    expect(summary).toHaveProperty('byType');
    expect(summary).toHaveProperty('recentUpdates');

    expect(summary.byStatus).toHaveProperty('compliant', 2);
    expect(summary.byStatus).toHaveProperty('non_compliant', 1);
    expect(summary.byStatus).toHaveProperty('pending', 1);
    expect(summary.byStatus).toHaveProperty('review', 1);
  });

  it('should calculate complianceRate correctly', async () => {
    const res = await request(app)
      .get('/api/compliance/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    // 2 compliant out of 5 total = 40%
    expect(res.body.summary.complianceRate).toBe(40);
  });
});

// ──────────────────────────────────────────────────────────
// Status update
// ──────────────────────────────────────────────────────────

describe('PUT /api/compliance/:id/status', () => {
  let recordId: number;

  beforeEach(async () => {
    const record = await ComplianceRecord.create({
      userId: 1,
      complianceType: 'GDPR',
      status: 'pending',
      lastChecked: new Date(),
    });
    recordId = record.id;
  });

  it('should update status and return 200 with updated record', async () => {
    const res = await request(app)
      .put(`/api/compliance/${recordId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'compliant' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('compliant');
    expect(res.body.id).toBe(recordId);
    expect(res.body.lastChecked).toBeTruthy();
  });

  it('should return 400 for invalid status value', async () => {
    const res = await request(app)
      .put(`/api/compliance/${recordId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 404 for non-existent record', async () => {
    const res = await request(app)
      .put('/api/compliance/99999/status')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'compliant' });

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
