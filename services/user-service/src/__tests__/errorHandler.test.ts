import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';

/**
 * Creates a minimal Express app that throws the given error
 * from a route, then passes it through the errorHandler middleware.
 */
function createTestApp(err: Error) {
  const app = express();
  app.get('/test', (_req, _res, next) => next(err));
  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  describe('AppError responses', () => {
    it('returns standardized format for 400 VALIDATION_ERROR', async () => {
      const app = createTestApp(AppError.badRequest('Invalid email', { field: 'email' }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email',
          details: { field: 'email' },
        },
      });
    });

    it('returns standardized format for 401 UNAUTHORIZED', async () => {
      const app = createTestApp(AppError.unauthorized());

      const res = await request(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Unauthorized');
    });

    it('returns standardized format for 403 FORBIDDEN', async () => {
      const app = createTestApp(AppError.forbidden());

      const res = await request(app).get('/test');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns standardized format for 404 NOT_FOUND', async () => {
      const app = createTestApp(AppError.notFound());

      const res = await request(app).get('/test');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns standardized format for 409 CONFLICT', async () => {
      const app = createTestApp(AppError.conflict('Email taken', { email: 'dup@test.com' }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.details).toEqual({ email: 'dup@test.com' });
    });
  });

  describe('status code to code mapping', () => {
    it('maps 429 to RATE_LIMIT_EXCEEDED', async () => {
      const err = new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
      const app = createTestApp(err);

      const res = await request(app).get('/test');

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('unknown / generic errors', () => {
    it('returns 500 INTERNAL_ERROR for non-AppError exceptions', async () => {
      const app = createTestApp(new Error('Something unexpected'));

      const res = await request(app).get('/test');

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      // Should not leak internal error messages in production
      expect(res.body.error.message).toBe('Internal server error');
    });

    it('omits details when not provided', async () => {
      const app = createTestApp(AppError.unauthorized('Bad token'));

      const res = await request(app).get('/test');

      expect(res.body.error.details).toBeUndefined();
    });
  });
});
