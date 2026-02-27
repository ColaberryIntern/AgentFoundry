import request from 'supertest';
import { app } from '../index';

describe('GET /health', () => {
  it('returns 200 with status ok and service name', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'user-service');
    expect(res.body).toHaveProperty('timestamp');
    // timestamp must be a valid ISO-8601 string
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('returns correct Content-Type header', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
