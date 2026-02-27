import request from 'supertest';
import { app } from '../index';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('includes the service name "api-gateway"', async () => {
    const res = await request(app).get('/health');

    expect(res.body).toHaveProperty('service', 'api-gateway');
  });

  it('includes a valid ISO-8601 timestamp', async () => {
    const res = await request(app).get('/health');

    expect(res.body).toHaveProperty('timestamp');
    // Verify the timestamp parses to a valid date
    const parsed = new Date(res.body.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });
});
