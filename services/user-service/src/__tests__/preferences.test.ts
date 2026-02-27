import request from 'supertest';
import { app } from '../index';
import { sequelize } from '../config/database';
import { User, UserPreference } from '../models';
import { generateAccessToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';

// Ensure test environment
process.env.NODE_ENV = 'test';

const VALID_PASSWORD = 'StrongP@ss1';

let testUserId: number;
let testToken: string;

/**
 * Helper: create a user directly in the DB and generate a JWT for them.
 */
async function createTestUser(): Promise<{ id: number; token: string }> {
  const passwordHash = await hashPassword(VALID_PASSWORD);
  const user = await User.create({
    email: 'prefuser@test.com',
    passwordHash,
    role: 'compliance_officer',
    isVerified: true,
    verificationToken: null,
  });
  const token = generateAccessToken(user.id, user.email, user.role);
  return { id: user.id, token };
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  // Clear tables before each test
  await UserPreference.destroy({ where: {} });
  await User.destroy({ where: {} });

  // Seed a test user
  const testUser = await createTestUser();
  testUserId = testUser.id;
  testToken = testUser.token;
});

afterAll(async () => {
  await sequelize.close();
});

// ─────────────────────────────────────────────────────────
// GET /api/users/preferences
// ─────────────────────────────────────────────────────────
describe('GET /api/users/preferences', () => {
  it('should return 200 and create default preferences when none exist', async () => {
    const res = await request(app)
      .get('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('preferences');
    expect(res.body.preferences).toHaveProperty('theme', 'system');
    expect(res.body.preferences).toHaveProperty('layoutPreferences');
    expect(res.body.preferences.layoutPreferences).toEqual({});
    expect(res.body.preferences).toHaveProperty('userId', testUserId);
  });

  it('should return 200 and return existing preferences', async () => {
    // Seed a preference record
    await UserPreference.create({
      userId: testUserId,
      theme: 'dark',
      layoutPreferences: { sidebar: 'expanded' },
    });

    const res = await request(app)
      .get('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.preferences).toHaveProperty('theme', 'dark');
    expect(res.body.preferences.layoutPreferences).toEqual({ sidebar: 'expanded' });
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).get('/api/users/preferences');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

// ─────────────────────────────────────────────────────────
// PUT /api/users/preferences
// ─────────────────────────────────────────────────────────
describe('PUT /api/users/preferences', () => {
  it('should return 200 and update theme to dark', async () => {
    const res = await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ theme: 'dark' });

    expect(res.status).toBe(200);
    expect(res.body.preferences).toHaveProperty('theme', 'dark');
  });

  it('should return 200 and update theme to light', async () => {
    const res = await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ theme: 'light' });

    expect(res.status).toBe(200);
    expect(res.body.preferences).toHaveProperty('theme', 'light');
  });

  it('should return 200 and update layoutPreferences', async () => {
    const res = await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ layoutPreferences: { sidebar: 'collapsed' } });

    expect(res.status).toBe(200);
    expect(res.body.preferences.layoutPreferences).toEqual({ sidebar: 'collapsed' });
  });

  it('should return 200 on partial update (only theme, keeps layoutPreferences)', async () => {
    // First set both values
    await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ theme: 'dark', layoutPreferences: { sidebar: 'collapsed' } });

    // Then update only theme
    const res = await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ theme: 'light' });

    expect(res.status).toBe(200);
    expect(res.body.preferences).toHaveProperty('theme', 'light');
    expect(res.body.preferences.layoutPreferences).toEqual({ sidebar: 'collapsed' });
  });

  it('should return 400 for invalid theme value', async () => {
    const res = await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ theme: 'neon' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).put('/api/users/preferences').send({ theme: 'dark' });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 200 and update theme to system', async () => {
    // First set theme to dark
    await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ theme: 'dark' });

    // Then switch back to system
    const res = await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ theme: 'system' });

    expect(res.status).toBe(200);
    expect(res.body.preferences).toHaveProperty('theme', 'system');
  });
});
