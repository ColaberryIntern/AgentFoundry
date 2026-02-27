// Set environment before importing anything
process.env.NODE_ENV = 'test';

import request from 'supertest';
import { app } from '../index';

describe('API Documentation', () => {
  // -------------------------------------------------------------------------
  // GET /api/docs — Swagger UI HTML
  // -------------------------------------------------------------------------
  describe('GET /api/docs', () => {
    it('returns 200 with Swagger UI HTML', async () => {
      const res = await request(app).get('/api/docs/').redirects(1);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('swagger');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/docs.json — raw OpenAPI spec
  // -------------------------------------------------------------------------
  describe('GET /api/docs.json', () => {
    it('returns valid OpenAPI spec with correct version', async () => {
      const res = await request(app).get('/api/docs.json');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toHaveProperty('openapi', '3.0.3');
      expect(res.body).toHaveProperty('info');
      expect(res.body.info).toHaveProperty('version', '1.0.0');
      expect(res.body.info).toHaveProperty('title', 'Agent Foundry API');
    });

    it('contains paths, components, and security schemes', async () => {
      const res = await request(app).get('/api/docs.json');

      expect(res.body).toHaveProperty('paths');
      expect(Object.keys(res.body.paths).length).toBeGreaterThan(0);

      expect(res.body).toHaveProperty('components');
      expect(res.body.components).toHaveProperty('schemas');
      expect(res.body.components).toHaveProperty('securitySchemes');

      // Verify both security schemes exist
      expect(res.body.components.securitySchemes).toHaveProperty('bearerAuth');
      expect(res.body.components.securitySchemes).toHaveProperty('apiKeyAuth');
      expect(res.body.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
      expect(res.body.components.securitySchemes.apiKeyAuth.type).toBe('apiKey');
    });

    it('has tags for all major service areas', async () => {
      const res = await request(app).get('/api/docs.json');

      const tagNames = res.body.tags.map((t: { name: string }) => t.name);
      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Compliance');
      expect(tagNames).toContain('Reports');
      expect(tagNames).toContain('AI Recommendations');
      expect(tagNames).toContain('Notifications');
      expect(tagNames).toContain('Webhooks');
      expect(tagNames).toContain('Search');
      expect(tagNames).toContain('Analytics');
      expect(tagNames).toContain('Feedback');
    });

    it('documents key endpoint paths', async () => {
      const res = await request(app).get('/api/docs.json');

      const paths = Object.keys(res.body.paths);
      expect(paths).toContain('/health');
      expect(paths).toContain('/api/users');
      expect(paths).toContain('/api/compliance');
      expect(paths).toContain('/api/reports');
      expect(paths).toContain('/api/recommendations');
      expect(paths).toContain('/api/notifications');
      expect(paths).toContain('/api/webhooks');
      expect(paths).toContain('/api/search');
      expect(paths).toContain('/api/analytics/event');
      expect(paths).toContain('/api/feedback');
    });
  });
});
