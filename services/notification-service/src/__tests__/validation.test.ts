import request from 'supertest';
import app from '../index';
import { sequelize, Notification, initModels } from '../models';

const JWT_SECRET = 'test-jwt-secret-for-notifications';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = JWT_SECRET;
  await initModels();
});

afterEach(async () => {
  await Notification.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/notifications — input validation', () => {
  it('should return 400 when userId is not a valid UUID', async () => {
    const res = await request(app).post('/api/notifications').send({
      userId: 'not-a-uuid',
      type: 'system',
      title: 'Test',
      message: 'Test message',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('details');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('should return 400 when type is invalid', async () => {
    const res = await request(app).post('/api/notifications').send({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'invalid_type',
      title: 'Test',
      message: 'Test message',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when title is empty', async () => {
    const res = await request(app).post('/api/notifications').send({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'system',
      title: '',
      message: 'Test message',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});
