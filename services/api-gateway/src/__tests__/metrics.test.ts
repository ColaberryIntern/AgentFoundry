import request from 'supertest';
import { app } from '../index';

describe('GET /metrics', () => {
  it('returns 200 with Prometheus format content', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    // Prometheus text format contains "# HELP" and "# TYPE" lines
    expect(res.text).toContain('# HELP');
    expect(res.text).toContain('# TYPE');
    // Should contain our custom metric
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
  });
});
