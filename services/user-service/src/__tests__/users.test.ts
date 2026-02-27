import request from 'supertest';
import { app } from '../index';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import '../utils/jwt';
import '../utils/password';
import jwt from 'jsonwebtoken';

// Ensure test environment
process.env.NODE_ENV = 'test';

const VALID_PASSWORD = 'StrongP@ss1';
const WEAK_PASSWORD = 'weak';

/**
 * Helper: register a user and return the response body.
 */
async function registerUser(overrides: Record<string, unknown> = {}) {
  const data = {
    email: 'test@example.com',
    password: VALID_PASSWORD,
    ...overrides,
  };
  return request(app).post('/api/users/register').send(data);
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterEach(async () => {
  await User.destroy({ where: {}, truncate: true });
});

afterAll(async () => {
  await sequelize.close();
});

// ─────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────
describe('POST /api/users/register', () => {
  it('should register a new user and return 201 with user, accessToken, refreshToken', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    // User object must not contain passwordHash
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
    expect(res.body.user).toHaveProperty('role', 'compliance_officer');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('verificationToken');

    // Tokens must be non-empty strings
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.length).toBeGreaterThan(0);
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken.length).toBeGreaterThan(0);
  });

  it('should return 409 CONFLICT when email is already registered', async () => {
    await registerUser();
    const res = await registerUser();

    expect(res.status).toBe(409);
    expect(res.body.error).toHaveProperty('code', 'CONFLICT');
    expect(res.body.error.message).toMatch(/already registered/i);
  });

  it('should return 400 VALIDATION_ERROR with details for weak password', async () => {
    const res = await registerUser({ password: WEAK_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('details');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('should return 400 for invalid email format', async () => {
    const res = await registerUser({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/users/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 for invalid role', async () => {
    const res = await registerUser({ role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should set isVerified to false and generate a verificationToken', async () => {
    await registerUser();
    const user = await User.findOne({ where: { email: 'test@example.com' } });

    expect(user).not.toBeNull();
    expect(user!.isVerified).toBe(false);
    expect(user!.verificationToken).not.toBeNull();
    expect(typeof user!.verificationToken).toBe('string');
    expect(user!.verificationToken!.length).toBe(64); // 32 bytes hex
  });
});

// ─────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────
describe('POST /api/users/login', () => {
  beforeEach(async () => {
    // Seed a user for login tests
    await registerUser();
  });

  it('should login with valid credentials and return 200 with user + tokens', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'test@example.com', password: VALID_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 UNAUTHORIZED for wrong password', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'test@example.com', password: 'WrongP@ss1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    expect(res.body.error.message).toMatch(/invalid/i);
  });

  it('should return 401 UNAUTHORIZED for non-existent email', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'nobody@example.com', password: VALID_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 400 when email or password is missing', async () => {
    const res1 = await request(app).post('/api/users/login').send({ email: 'test@example.com' });

    expect(res1.status).toBe(400);
    expect(res1.body.error).toHaveProperty('code', 'VALIDATION_ERROR');

    const res2 = await request(app).post('/api/users/login').send({ password: VALID_PASSWORD });

    expect(res2.status).toBe(400);
    expect(res2.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────
// Email Verification
// ─────────────────────────────────────────────────────────
describe('GET /api/users/verify/:token', () => {
  it('should verify email with a valid token and return 200', async () => {
    await registerUser();
    const user = await User.findOne({ where: { email: 'test@example.com' } });
    const verificationToken = user!.verificationToken!;

    const res = await request(app).get(`/api/users/verify/${verificationToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Email verified successfully');

    // Confirm DB state
    await user!.reload();
    expect(user!.isVerified).toBe(true);
    expect(user!.verificationToken).toBeNull();
  });

  it('should return 400 for an invalid verification token', async () => {
    const res = await request(app).get('/api/users/verify/invalid-token-12345');

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/invalid|expired/i);
  });
});

// ─────────────────────────────────────────────────────────
// Token Refresh
// ─────────────────────────────────────────────────────────
describe('POST /api/users/refresh-token', () => {
  it('should return new tokens when given a valid refresh token', async () => {
    const regRes = await registerUser();
    const { refreshToken } = regRes.body;

    const res = await request(app).post('/api/users/refresh-token').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('should return 401 for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/users/refresh-token')
      .send({ refreshToken: 'not-a-valid-token' });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 401 when no refresh token is provided', async () => {
    const res = await request(app).post('/api/users/refresh-token').send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

// ─────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────
describe('GET /api/users/profile', () => {
  it('should return user profile with a valid JWT', async () => {
    const regRes = await registerUser();
    const { accessToken } = regRes.body;

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 when no JWT is provided', async () => {
    const res = await request(app).get('/api/users/profile');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 401 with an expired JWT', async () => {
    // Create a token that is already expired
    const secret = process.env.JWT_SECRET || 'fallback-test-secret-do-not-use-in-production';
    const expiredToken = jwt.sign({ userId: 1, email: 'test@example.com', role: 'user' }, secret, {
      expiresIn: '0s',
    });

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 401 with a malformed Authorization header', async () => {
    const res = await request(app).get('/api/users/profile').set('Authorization', 'InvalidFormat');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});
