/**
 * E2E Integration Tests -- Full User Service Journey
 *
 * Tests the complete user lifecycle in sequential order:
 *   Register -> Verify Email -> Login -> Profile -> Refresh Token ->
 *   IT Admin assigns role -> Generate API Key -> List API Keys ->
 *   Revoke API Key -> List Roles
 *
 * Each test depends on state built up by previous tests within the
 * describe block.  Variables are shared across tests intentionally
 * to model a real user session.
 */
import request from 'supertest';
import { app } from '../index';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import '../models/ApiKey';
import { AuditLog } from '../models/AuditLog';
import '../utils/jwt';

// Ensure test environment
process.env.NODE_ENV = 'test';

const VALID_PASSWORD = 'StrongP@ss1';

// ── Shared state across sequential tests ────────────────────────────
let userId: number;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _userEmail: string;
let accessToken: string;
let refreshToken: string;
let verificationToken: string;

let adminUserId: number;
let adminAccessToken: string;

let apiKeyId: number;

// ── Lifecycle ───────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

// ── Journey ─────────────────────────────────────────────────────────

describe('E2E User Journey', () => {
  // ----------------------------------------------------------------
  // Step 1: Register a new user
  // ----------------------------------------------------------------
  it('Step 1 — should register a new user and receive tokens', async () => {
    const res = await request(app).post('/api/users/register').send({
      email: 'alice@example.com',
      password: VALID_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.role).toBe('compliance_officer');
    expect(res.body.user.isVerified).toBe(false);
    expect(res.body.user).not.toHaveProperty('passwordHash');

    userId = res.body.user.id;
    _userEmail = res.body.user.email;
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  // ----------------------------------------------------------------
  // Step 2: Verify email
  // ----------------------------------------------------------------
  it('Step 2 — should retrieve verification token from DB and verify email', async () => {
    const user = await User.findByPk(userId);
    expect(user).not.toBeNull();
    expect(user!.verificationToken).toBeTruthy();
    verificationToken = user!.verificationToken!;

    const res = await request(app).get(`/api/users/verify/${verificationToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email verified successfully');

    // Confirm DB state updated
    await user!.reload();
    expect(user!.isVerified).toBe(true);
    expect(user!.verificationToken).toBeNull();
  });

  // ----------------------------------------------------------------
  // Step 3: Login with verified credentials
  // ----------------------------------------------------------------
  it('Step 3 — should login with valid credentials and receive fresh tokens', async () => {
    const res = await request(app).post('/api/users/login').send({
      email: 'alice@example.com',
      password: VALID_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    // Update tokens with fresh login tokens
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  // ----------------------------------------------------------------
  // Step 4: Access profile with JWT
  // ----------------------------------------------------------------
  it('Step 4 — should access profile with a valid JWT', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.isVerified).toBe(true);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  // ----------------------------------------------------------------
  // Step 5: Refresh token
  // ----------------------------------------------------------------
  it('Step 5 — should refresh tokens using the refresh token', async () => {
    const res = await request(app).post('/api/users/refresh-token').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');

    // Update with new tokens
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  // ----------------------------------------------------------------
  // Step 6: Access profile with refreshed token
  // ----------------------------------------------------------------
  it('Step 6 — should access profile with the refreshed access token', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.email).toBe('alice@example.com');
  });

  // ----------------------------------------------------------------
  // Step 7: Create an IT Admin user to perform admin operations
  // ----------------------------------------------------------------
  it('Step 7 — should register an IT Admin user', async () => {
    const res = await request(app).post('/api/users/register').send({
      email: 'admin@example.com',
      password: VALID_PASSWORD,
      role: 'it_admin',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('it_admin');

    adminUserId = res.body.user.id;
    adminAccessToken = res.body.accessToken;
  });

  // ----------------------------------------------------------------
  // Step 8: IT Admin lists all roles
  // ----------------------------------------------------------------
  it('Step 8 — IT Admin should list all available roles', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('roles');
    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(res.body.roles.length).toBe(3);

    const roleNames = res.body.roles.map((r: { name: string }) => r.name);
    expect(roleNames).toContain('c_suite');
    expect(roleNames).toContain('compliance_officer');
    expect(roleNames).toContain('it_admin');
  });

  // ----------------------------------------------------------------
  // Step 9: IT Admin lists all users
  // ----------------------------------------------------------------
  it('Step 9 — IT Admin should list all users', async () => {
    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body.total).toBeGreaterThanOrEqual(2);

    const emails = res.body.users.map((u: { email: string }) => u.email);
    expect(emails).toContain('alice@example.com');
    expect(emails).toContain('admin@example.com');
  });

  // ----------------------------------------------------------------
  // Step 10: IT Admin assigns a role to Alice
  // ----------------------------------------------------------------
  it('Step 10 — IT Admin should assign c_suite role to Alice', async () => {
    const res = await request(app)
      .put(`/api/roles/users/${userId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ role: 'c_suite' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('c_suite');
    expect(res.body.message).toBe('Role updated successfully');
  });

  // ----------------------------------------------------------------
  // Step 11: Verify Alice's new role via profile
  // ----------------------------------------------------------------
  it('Step 11 — Alice profile should reflect new c_suite role', async () => {
    // Re-login to get a token with the updated role
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'alice@example.com', password: VALID_PASSWORD });

    expect(loginRes.status).toBe(200);
    accessToken = loginRes.body.accessToken;

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('c_suite');
  });

  // ----------------------------------------------------------------
  // Step 12: IT Admin generates an API key
  // ----------------------------------------------------------------
  it('Step 12 — IT Admin should generate an API key', async () => {
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name: 'CI/CD Pipeline Key' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('apiKey');
    expect(res.body.apiKey.name).toBe('CI/CD Pipeline Key');
    expect(res.body.apiKey.key).toBeTruthy();
    expect(res.body.apiKey.key).toMatch(/^af_/);
    expect(res.body.apiKey.prefix).toBeTruthy();

    apiKeyId = res.body.apiKey.id;
  });

  // ----------------------------------------------------------------
  // Step 13: IT Admin lists API keys
  // ----------------------------------------------------------------
  it('Step 13 — IT Admin should list their API keys', async () => {
    const res = await request(app)
      .get('/api/keys')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('apiKeys');
    expect(res.body.apiKeys.length).toBeGreaterThanOrEqual(1);

    const key = res.body.apiKeys.find((k: { id: number }) => k.id === apiKeyId);
    expect(key).toBeDefined();
    expect(key.name).toBe('CI/CD Pipeline Key');
    expect(key.isActive).toBe(true);
  });

  // ----------------------------------------------------------------
  // Step 14: IT Admin revokes the API key
  // ----------------------------------------------------------------
  it('Step 14 — IT Admin should revoke the API key', async () => {
    const res = await request(app)
      .delete(`/api/keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('API key revoked successfully');
  });

  // ----------------------------------------------------------------
  // Step 15: Verify API key is now inactive
  // ----------------------------------------------------------------
  it('Step 15 — revoked API key should show as inactive', async () => {
    const res = await request(app)
      .get('/api/keys')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(200);
    const key = res.body.apiKeys.find((k: { id: number }) => k.id === apiKeyId);
    expect(key).toBeDefined();
    expect(key.isActive).toBe(false);
  });

  // ----------------------------------------------------------------
  // Step 16: Verify audit logs were created for admin actions
  // ----------------------------------------------------------------
  it('Step 16 — audit logs should record admin actions', async () => {
    // Give the fire-and-forget audit log writes a moment to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    const logs = await AuditLog.findAll({
      where: { userId: adminUserId },
      order: [['createdAt', 'ASC']],
    });

    // Expect at least role.assign, apikey.generate, and apikey.revoke
    const actions = logs.map((l) => l.action);
    expect(actions).toContain('role.assign');
    expect(actions).toContain('apikey.generate');
    expect(actions).toContain('apikey.revoke');
  });

  // ----------------------------------------------------------------
  // Step 17: Non-admin cannot access admin endpoints
  // ----------------------------------------------------------------
  it('Step 17 — non-admin user should be forbidden from admin endpoints', async () => {
    // Alice is now c_suite, not it_admin -- should be forbidden from manage_users
    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  // ----------------------------------------------------------------
  // Step 18: Unauthenticated access should be rejected
  // ----------------------------------------------------------------
  it('Step 18 — unauthenticated requests should return 401', async () => {
    const profileRes = await request(app).get('/api/users/profile');
    expect(profileRes.status).toBe(401);

    const keysRes = await request(app).get('/api/keys');
    expect(keysRes.status).toBe(401);

    const rolesRes = await request(app).get('/api/roles');
    expect(rolesRes.status).toBe(401);
  });
});
