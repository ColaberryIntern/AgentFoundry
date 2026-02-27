// Set environment before importing anything
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { initModels, sequelize } from '../models';

const JWT_SECRET = 'test-jwt-secret-for-gateway';

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

beforeAll(async () => {
  await initModels();
});

afterAll(async () => {
  await sequelize.close();
});

describe('API Versioning', () => {
  // -------------------------------------------------------------------------
  // Version header on normal requests
  // -------------------------------------------------------------------------
  describe('X-API-Version header', () => {
    it('includes X-API-Version header in response (defaults to v1)', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-api-version']).toBe('v1');
    });

    it('echoes back a valid X-API-Version header from request', async () => {
      const res = await request(app).get('/health').set('X-API-Version', 'v1');

      expect(res.status).toBe(200);
      expect(res.headers['x-api-version']).toBe('v1');
    });

    it('defaults to v1 when an unsupported version is requested', async () => {
      const res = await request(app).get('/health').set('X-API-Version', 'v99');

      expect(res.status).toBe(200);
      expect(res.headers['x-api-version']).toBe('v1');
    });
  });

  // -------------------------------------------------------------------------
  // /api/v1/* prefix routing
  // -------------------------------------------------------------------------
  describe('/api/v1/* prefix routing', () => {
    it('forwards /api/v1/search to /api/search (requires auth)', async () => {
      const token = generateToken({ userId: 'version-test-user', role: 'admin' });
      const res = await request(app)
        .get('/api/v1/search?q=compliance')
        .set('Authorization', `Bearer ${token}`);

      // Should forward to /api/search and return results
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.headers['x-api-version']).toBe('v1');
    });

    it('forwards /api/v1/docs.json to /api/docs.json', async () => {
      const res = await request(app).get('/api/v1/docs.json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('openapi');
      expect(res.headers['x-api-version']).toBe('v1');
    });

    it('response includes X-API-Version header set to v1', async () => {
      const res = await request(app).get('/api/v1/docs.json');

      expect(res.headers['x-api-version']).toBe('v1');
    });
  });
});
