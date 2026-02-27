import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import { Report } from '../models/Report';

process.env.NODE_ENV = 'test';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-reporting';
process.env.JWT_SECRET = JWT_SECRET;

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
  email: 'user@test.com',
  role: 'user',
};

let userToken: string;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  userToken = generateToken(testUser);
});

afterEach(async () => {
  await Report.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/reports — input validation', () => {
  it('should return 400 when reportType is invalid', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportType: 'invalid_type',
        format: 'pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('details');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('should return 400 when format is invalid', async () => {
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
});
