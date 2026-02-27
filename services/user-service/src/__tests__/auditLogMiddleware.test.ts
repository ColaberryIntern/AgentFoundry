import express, { Request, Response } from 'express';
import request from 'supertest';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { auditLog } from '../middleware/auditLog';

// Force test environment
process.env.NODE_ENV = 'test';

const validUserAttrs = {
  email: 'audit-mw@example.com',
  passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12',
  role: 'it_admin' as const,
};

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

afterEach(async () => {
  await AuditLog.destroy({ where: {}, truncate: true });
  await User.destroy({ where: {}, truncate: true });
});

/**
 * Helper to wait briefly for async fire-and-forget operations to complete.
 */
function waitForAsync(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('auditLog middleware', () => {
  it('logs an audit entry on successful response (2xx)', async () => {
    // Create a real user in the DB so the FK constraint is satisfied
    const user = await User.create(validUserAttrs);

    const app = express();
    app.use(express.json());

    // Fake auth middleware using the real user's id
    app.use((req: Request, _res, next) => {
      req.user = { userId: user.id, email: user.email, role: user.role };
      next();
    });

    app.post(
      '/api/resource/:id',
      auditLog('resource.update', 'resource'),
      (req: Request, res: Response) => {
        res.status(200).json({ id: req.params.id, updated: true });
      },
    );

    const res = await request(app).post('/api/resource/42').send({ name: 'test' });
    expect(res.status).toBe(200);

    // Wait for fire-and-forget audit log write
    await waitForAsync();

    const logs = await AuditLog.findAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('resource.update');
    expect(logs[0].resource).toBe('resource');
    expect(logs[0].userId).toBe(user.id);
    expect(logs[0].resourceId).toBe('42');
  });

  it('does NOT log on non-2xx responses', async () => {
    const user = await User.create(validUserAttrs);

    const app = express();
    app.use(express.json());

    app.use((req: Request, _res, next) => {
      req.user = { userId: user.id, email: user.email, role: user.role };
      next();
    });

    app.get(
      '/api/resource/:id',
      auditLog('resource.read', 'resource'),
      (_req: Request, res: Response) => {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      },
    );

    const res = await request(app).get('/api/resource/99');
    expect(res.status).toBe(404);

    await waitForAsync();

    const logs = await AuditLog.findAll();
    expect(logs).toHaveLength(0);
  });

  it('logs with null userId when no user is on the request', async () => {
    const app = express();
    app.use(express.json());

    app.get('/api/public', auditLog('public.access', 'page'), (_req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    });

    await request(app).get('/api/public');
    await waitForAsync();

    const logs = await AuditLog.findAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBeNull();
    expect(logs[0].action).toBe('public.access');
  });

  it('captures IP address and user agent', async () => {
    const user = await User.create({
      ...validUserAttrs,
      email: 'audit-mw-ip@example.com',
    });

    const app = express();
    app.use(express.json());

    app.use((req: Request, _res, next) => {
      req.user = { userId: user.id, email: user.email, role: user.role };
      next();
    });

    app.get('/api/data', auditLog('data.read', 'data'), (_req: Request, res: Response) => {
      res.status(200).json({ data: [] });
    });

    await request(app).get('/api/data').set('User-Agent', 'CustomAgent/2.0');

    await waitForAsync();

    const logs = await AuditLog.findAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].userAgent).toBe('CustomAgent/2.0');
    // IP address should be captured (supertest uses 127.0.0.1 or ::ffff:127.0.0.1)
    expect(logs[0].ipAddress).toBeDefined();
    expect(typeof logs[0].ipAddress).toBe('string');
  });

  it('does not block the response (fire-and-forget)', async () => {
    const app = express();
    app.use(express.json());

    app.get('/api/fast', auditLog('fast.read', 'fast'), (_req: Request, res: Response) => {
      res.status(200).json({ fast: true });
    });

    const start = Date.now();
    const res = await request(app).get('/api/fast');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    // Response should be fast -- audit logging should not add noticeable latency
    expect(elapsed).toBeLessThan(500);
  });
});
