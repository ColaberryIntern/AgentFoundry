import request from 'supertest';
import app from '../index';

describe('GET /health', () => {
  it('should return 200 with service health information', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'reporting-service');
    expect(response.body).toHaveProperty('timestamp');
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });
});
