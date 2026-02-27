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
let userToken: string;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  userToken = generateToken(testUser);
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await ComplianceRecord.destroy({ where: {} });
});

describe('POST /api/compliance/monitor — input validation', () => {
  it('should return 400 when regulation_id is missing', async () => {
    const res = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        compliance_type: 'GDPR',
        data_source: 'user_database',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('details');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('should return 400 when data_source is missing', async () => {
    const res = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        compliance_type: 'GDPR',
        regulation_id: 'REG-001',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when threshold is out of range', async () => {
    const res = await request(app)
      .post('/api/compliance/monitor')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        compliance_type: 'GDPR',
        regulation_id: 'REG-001',
        data_source: 'user_database',
        threshold: 150,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    const thresholdError = res.body.error.details.find(
      (d: { path: string }) => d.path === 'threshold',
    );
    expect(thresholdError).toBeDefined();
  });
});

describe('PUT /api/compliance/:id/status — input validation', () => {
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

  it('should return 400 when status is not a valid enum value', async () => {
    const res = await request(app)
      .put(`/api/compliance/${recordId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'invalid_value' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});
