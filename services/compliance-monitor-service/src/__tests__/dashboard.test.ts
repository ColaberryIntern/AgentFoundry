import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import ComplianceRecord from '../models/ComplianceRecord';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function generateToken(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const regularUser = { userId: 1, email: 'user@test.com', role: 'user' };
const complianceOfficer = { userId: 2, email: 'officer@test.com', role: 'compliance_officer' };
const itAdmin = { userId: 3, email: 'admin@test.com', role: 'it_admin' };

let regularToken: string;
let officerToken: string;
let adminToken: string;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  regularToken = generateToken(regularUser);
  officerToken = generateToken(complianceOfficer);
  adminToken = generateToken(itAdmin);
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await ComplianceRecord.destroy({ where: {} });
});

describe('GET /api/dashboard', () => {
  it('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 200 with dashboard data', async () => {
    await ComplianceRecord.bulkCreate([
      { userId: 1, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'HIPAA', status: 'non_compliant', lastChecked: new Date() },
      { userId: 2, complianceType: 'SOX', status: 'pending', lastChecked: new Date() },
    ]);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dashboard');
  });

  it('should include complianceRate, openIssues, alertsCount, recentUpdates, and trend', async () => {
    await ComplianceRecord.bulkCreate([
      { userId: 1, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'HIPAA', status: 'non_compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'SOX', status: 'pending', lastChecked: new Date() },
      { userId: 1, complianceType: 'CCPA', status: 'review', lastChecked: new Date() },
    ]);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${regularToken}`);

    const { dashboard } = res.body;
    expect(dashboard).toHaveProperty('complianceRate');
    expect(dashboard).toHaveProperty('openIssues');
    expect(dashboard).toHaveProperty('alertsCount');
    expect(dashboard).toHaveProperty('recentUpdates');
    expect(dashboard).toHaveProperty('trend');
  });

  it('should calculate correct complianceRate and openIssues', async () => {
    await ComplianceRecord.bulkCreate([
      { userId: 1, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'HIPAA', status: 'compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'SOX', status: 'non_compliant', lastChecked: new Date() },
      { userId: 1, complianceType: 'CCPA', status: 'non_compliant', lastChecked: new Date() },
    ]);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${regularToken}`);

    const { dashboard } = res.body;
    expect(dashboard.complianceRate).toBe(50);
    expect(dashboard.openIssues).toBe(2);
  });

  it('should have trend array with date and rate entries', async () => {
    // Create records on different dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await ComplianceRecord.bulkCreate([
      {
        userId: 1,
        complianceType: 'GDPR',
        status: 'compliant',
        lastChecked: today,
        createdAt: today,
        updatedAt: today,
      },
      {
        userId: 1,
        complianceType: 'HIPAA',
        status: 'non_compliant',
        lastChecked: yesterday,
        createdAt: yesterday,
        updatedAt: yesterday,
      },
    ]);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${regularToken}`);

    const { dashboard } = res.body;
    expect(Array.isArray(dashboard.trend)).toBe(true);
    if (dashboard.trend.length > 0) {
      expect(dashboard.trend[0]).toHaveProperty('date');
      expect(dashboard.trend[0]).toHaveProperty('rate');
    }
  });

  it('should return zeros and empty arrays when no records exist', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${regularToken}`);

    const { dashboard } = res.body;
    expect(dashboard.complianceRate).toBe(0);
    expect(dashboard.openIssues).toBe(0);
    expect(dashboard.alertsCount).toBe(0);
    expect(dashboard.recentUpdates).toEqual([]);
    expect(dashboard.trend).toEqual([]);
  });

  it('should include detailed records for compliance_officer role', async () => {
    await ComplianceRecord.bulkCreate([
      { userId: 1, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
    ]);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${officerToken}`);

    const { dashboard } = res.body;
    expect(dashboard).toHaveProperty('detailedRecords');
  });

  it('should include system-level stats for it_admin role', async () => {
    await ComplianceRecord.bulkCreate([
      { userId: 1, complianceType: 'GDPR', status: 'compliant', lastChecked: new Date() },
    ]);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const { dashboard } = res.body;
    expect(dashboard).toHaveProperty('systemStats');
  });
});
