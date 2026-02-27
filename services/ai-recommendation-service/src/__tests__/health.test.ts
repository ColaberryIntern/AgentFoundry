import request from 'supertest';
import app from '../index';

describe('GET /health', () => {
  it('should return 200 with service health information', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'ai-recommendation-service');
    expect(response.body).toHaveProperty('timestamp');
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });

  it('includes version and uptime', async () => {
    const response = await request(app).get('/health');

    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('uptime');
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('includes memory checks', async () => {
    const response = await request(app).get('/health');

    expect(response.body).toHaveProperty('checks');
    expect(response.body.checks).toHaveProperty('memory');
    expect(response.body.checks.memory).toHaveProperty('used');
    expect(response.body.checks.memory).toHaveProperty('total');
  });
});
