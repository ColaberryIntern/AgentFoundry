import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { authorize } from '../middleware/authorize';
import { errorHandler } from '../middleware/errorHandler';

/**
 * Creates a mini Express app with a fake authenticate middleware
 * that sets req.user to the provided value, then applies the authorize
 * middleware with the given permissions.
 */
function createTestApp(
  userPayload: { userId: number; email: string; role: string } | undefined,
  ...permissions: Parameters<typeof authorize>
) {
  const app = express();

  // Fake authenticate middleware — sets req.user directly
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (userPayload) {
      req.user = userPayload;
    }
    next();
  });

  app.get('/protected', authorize(...permissions), (_req: Request, res: Response) => {
    res.status(200).json({ message: 'Access granted' });
  });

  app.use(errorHandler);
  return app;
}

describe('authorize middleware', () => {
  describe('authorized access', () => {
    it('allows access when user role has the required permission', async () => {
      const app = createTestApp(
        { userId: 1, email: 'admin@test.com', role: 'it_admin' },
        'manage_users',
      );

      const res = await request(app).get('/protected');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });

    it('allows access when user role has all required permissions', async () => {
      const app = createTestApp(
        { userId: 1, email: 'admin@test.com', role: 'it_admin' },
        'manage_users',
        'deploy_agents',
      );

      const res = await request(app).get('/protected');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });

    it('allows c_suite to access view_dashboard', async () => {
      const app = createTestApp(
        { userId: 2, email: 'ceo@test.com', role: 'c_suite' },
        'view_dashboard',
      );

      const res = await request(app).get('/protected');
      expect(res.status).toBe(200);
    });

    it('allows compliance_officer to access monitor_alerts', async () => {
      const app = createTestApp(
        { userId: 3, email: 'compliance@test.com', role: 'compliance_officer' },
        'monitor_alerts',
      );

      const res = await request(app).get('/protected');
      expect(res.status).toBe(200);
    });
  });

  describe('unauthorized access', () => {
    it('returns 403 FORBIDDEN when role lacks the required permission', async () => {
      const app = createTestApp(
        { userId: 2, email: 'ceo@test.com', role: 'c_suite' },
        'manage_users',
      );

      const res = await request(app).get('/protected');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toMatch(/insufficient permissions/i);
    });

    it('returns 403 when user has some but not all required permissions', async () => {
      // compliance_officer has view_dashboard but not manage_users
      const app = createTestApp(
        { userId: 3, email: 'compliance@test.com', role: 'compliance_officer' },
        'view_dashboard',
        'manage_users',
      );

      const res = await request(app).get('/protected');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 when no user is on the request (unauthenticated)', async () => {
      const app = createTestApp(undefined, 'view_dashboard');

      const res = await request(app).get('/protected');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 for c_suite trying to access manage_api_keys', async () => {
      const app = createTestApp(
        { userId: 2, email: 'ceo@test.com', role: 'c_suite' },
        'manage_api_keys',
      );

      const res = await request(app).get('/protected');
      expect(res.status).toBe(403);
    });

    it('returns 403 for compliance_officer trying to access deploy_agents', async () => {
      const app = createTestApp(
        { userId: 3, email: 'compliance@test.com', role: 'compliance_officer' },
        'deploy_agents',
      );

      const res = await request(app).get('/protected');
      expect(res.status).toBe(403);
    });
  });
});
