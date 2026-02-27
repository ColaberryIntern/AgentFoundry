import express, { Request, Response } from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import { ApiKey } from '../models/ApiKey';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import { errorHandler } from '../middleware/errorHandler';

// Force test environment
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

afterEach(async () => {
  await ApiKey.destroy({ where: {}, truncate: true });
  await User.destroy({ where: {}, truncate: true });
});

/**
 * Helper: creates a user + active API key in the database.
 * Returns the raw key string, user, and apiKey record.
 */
async function seedApiKey(overrides: Partial<{ isActive: boolean; expiresAt: Date | null }> = {}) {
  const user = await User.create({
    email: 'apikey-auth@example.com',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12',
    role: 'it_admin',
  });

  const rawKey = 'af_k9x8y7z6w5v4u3t2s1r0q9p8o7n6m5l4';
  const keyHash = await bcrypt.hash(rawKey, 10);

  const apiKey = await ApiKey.create({
    userId: user.id,
    keyHash,
    name: 'Test Key',
    prefix: rawKey.substring(0, 8),
    isActive: overrides.isActive ?? true,
    expiresAt: overrides.expiresAt ?? null,
  });

  return { user, apiKey, rawKey };
}

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/protected', authenticateApiKey, (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Authenticated via API key',
      user: req.user,
    });
  });

  app.use(errorHandler);
  return app;
}

describe('authenticateApiKey middleware', () => {
  it('authenticates with a valid API key and sets req.user', async () => {
    const { rawKey, user } = await seedApiKey();
    const app = createTestApp();

    const res = await request(app).get('/api/protected').set('X-API-Key', rawKey);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Authenticated via API key');
    expect(res.body.user).toHaveProperty('userId', user.id);
    expect(res.body.user).toHaveProperty('email', user.email);
    expect(res.body.user).toHaveProperty('role', 'it_admin');
  });

  it('updates lastUsedAt on successful authentication', async () => {
    const { rawKey, apiKey } = await seedApiKey();
    const app = createTestApp();

    expect(apiKey.lastUsedAt ?? null).toBeNull();

    await request(app).get('/api/protected').set('X-API-Key', rawKey);

    await apiKey.reload();
    expect(apiKey.lastUsedAt).not.toBeNull();
    expect(apiKey.lastUsedAt).toBeInstanceOf(Date);
  });

  it('returns 401 for an invalid API key', async () => {
    await seedApiKey(); // seed a valid key so prefix matching can run
    const app = createTestApp();

    const res = await request(app).get('/api/protected').set('X-API-Key', 'af_k9x8yINVALIDKEY');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toMatch(/invalid api key/i);
  });

  it('returns 401 for a deactivated API key', async () => {
    const { rawKey } = await seedApiKey({ isActive: false });
    const app = createTestApp();

    const res = await request(app).get('/api/protected').set('X-API-Key', rawKey);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for an expired API key', async () => {
    const { rawKey } = await seedApiKey({
      expiresAt: new Date(Date.now() - 60 * 1000), // expired 1 minute ago
    });
    const app = createTestApp();

    const res = await request(app).get('/api/protected').set('X-API-Key', rawKey);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when no X-API-Key header is provided', async () => {
    const app = createTestApp();

    const res = await request(app).get('/api/protected');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the API key prefix matches no records', async () => {
    const app = createTestApp();

    const res = await request(app)
      .get('/api/protected')
      .set('X-API-Key', 'zz_totallyNonexistentKey1234567890');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
