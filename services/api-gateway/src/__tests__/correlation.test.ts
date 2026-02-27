import request from 'supertest';
import { app } from '../index';

describe('Correlation ID middleware', () => {
  it('generates a correlation ID when none is provided', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
    // UUID v4 format
    expect(res.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('echoes back a provided X-Correlation-ID header', async () => {
    const customId = 'test-correlation-id-123';
    const res = await request(app).get('/health').set('X-Correlation-ID', customId);

    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBe(customId);
  });

  it('includes the correlation ID in response headers', async () => {
    const res = await request(app).get('/health');

    expect(res.headers).toHaveProperty('x-correlation-id');
    expect(typeof res.headers['x-correlation-id']).toBe('string');
    expect(res.headers['x-correlation-id'].length).toBeGreaterThan(0);
  });
});
