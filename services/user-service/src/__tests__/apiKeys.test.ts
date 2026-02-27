import request from 'supertest';
import { app } from '../index';
import { sequelize } from '../config/database';
import { User, ApiKey, AuditLog } from '../models';
import { generateAccessToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';
import { UserRole } from '../models/User';

// Ensure test environment
process.env.NODE_ENV = 'test';

const VALID_PASSWORD = 'StrongP@ss1';

interface TestUsers {
  itAdmin: { id: number; token: string };
  cSuite: { id: number; token: string };
  complianceOfficer: { id: number; token: string };
}

let testUsers: TestUsers;

/**
 * Helper: create a user directly in the DB and generate a JWT for them.
 */
async function createTestUser(
  email: string,
  role: UserRole,
): Promise<{ id: number; token: string }> {
  const passwordHash = await hashPassword(VALID_PASSWORD);
  const user = await User.create({
    email,
    passwordHash,
    role,
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
  // Clear all tables before each test
  await AuditLog.destroy({ where: {} });
  await ApiKey.destroy({ where: {} });
  await User.destroy({ where: {} });

  // Seed test users
  testUsers = {
    itAdmin: await createTestUser('admin@test.com', 'it_admin'),
    cSuite: await createTestUser('csuite@test.com', 'c_suite'),
    complianceOfficer: await createTestUser('compliance@test.com', 'compliance_officer'),
  };
});

afterAll(async () => {
  await sequelize.close();
});

// ─────────────────────────────────────────────────────────
// Key Generation
// ─────────────────────────────────────────────────────────
describe('POST /api/keys', () => {
  it('should generate a new API key as IT Admin and return 201 with the full key', async () => {
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ name: 'My Test Key' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('apiKey');

    const { apiKey } = res.body;
    expect(apiKey).toHaveProperty('id');
    expect(apiKey).toHaveProperty('name', 'My Test Key');
    expect(apiKey).toHaveProperty('prefix');
    expect(apiKey).toHaveProperty('key');
    expect(apiKey).toHaveProperty('createdAt');

    // Key must start with 'af_'
    expect(apiKey.key).toMatch(/^af_/);
    // Key should be approximately 67 chars: 'af_' (3) + 64 hex chars
    expect(apiKey.key.length).toBe(67);

    // Prefix should be the first 8 chars of the key
    expect(apiKey.prefix).toBe(apiKey.key.substring(0, 8));
  });

  it('should return 403 when requested by non-IT-Admin (C-Suite)', async () => {
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.cSuite.token}`)
      .send({ name: 'Test Key' });

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('should return 403 when requested by non-IT-Admin (Compliance Officer)', async () => {
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.complianceOfficer.token}`)
      .send({ name: 'Test Key' });

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('should return 400 when name is not provided', async () => {
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should accept an optional expiresAt date', async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ name: 'Expiring Key', expiresAt });

    expect(res.status).toBe(201);
    expect(res.body.apiKey).toHaveProperty('expiresAt');
    expect(new Date(res.body.apiKey.expiresAt).getTime()).toBeCloseTo(
      new Date(expiresAt).getTime(),
      -3,
    );
  });

  it('should create an audit log entry after key generation', async () => {
    await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ name: 'Audited Key' });

    // Allow a brief moment for the async audit log to be written
    await new Promise((resolve) => setTimeout(resolve, 200));

    const logs = await AuditLog.findAll({
      where: { action: 'apikey.generate', resource: 'api_key' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.userId).toBe(testUsers.itAdmin.id);
  });
});

// ─────────────────────────────────────────────────────────
// Key Listing
// ─────────────────────────────────────────────────────────
describe('GET /api/keys', () => {
  beforeEach(async () => {
    // Create a key for the IT Admin
    await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ name: 'Admin Key 1' });

    await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ name: 'Admin Key 2' });
  });

  it('should return 200 with the current user keys (no hash or full key in response)', async () => {
    const res = await request(app)
      .get('/api/keys')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('apiKeys');
    expect(Array.isArray(res.body.apiKeys)).toBe(true);
    expect(res.body.apiKeys.length).toBe(2);

    // Ensure no hash or full key is exposed
    for (const key of res.body.apiKeys) {
      expect(key).toHaveProperty('id');
      expect(key).toHaveProperty('name');
      expect(key).toHaveProperty('prefix');
      expect(key).toHaveProperty('isActive');
      expect(key).toHaveProperty('createdAt');
      expect(key).not.toHaveProperty('keyHash');
      expect(key).not.toHaveProperty('key');
    }
  });

  it('should return all keys when IT Admin uses ?all=true', async () => {
    const res = await request(app)
      .get('/api/keys?all=true')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('apiKeys');
    // All keys belong to itAdmin in this case, but all=true should still work
    expect(res.body.apiKeys.length).toBe(2);
  });

  it('should return empty array for user with no keys', async () => {
    const res = await request(app)
      .get('/api/keys')
      .set('Authorization', `Bearer ${testUsers.cSuite.token}`);

    expect(res.status).toBe(200);
    expect(res.body.apiKeys).toEqual([]);
  });

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/keys');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

// ─────────────────────────────────────────────────────────
// Key Revocation
// ─────────────────────────────────────────────────────────
describe('DELETE /api/keys/:id', () => {
  let adminKeyId: number;

  beforeEach(async () => {
    // Create a key for the IT Admin
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ name: 'Key to Revoke' });
    adminKeyId = res.body.apiKey.id;
  });

  it('should revoke a key as the key owner and return 200', async () => {
    const res = await request(app)
      .delete(`/api/keys/${adminKeyId}`)
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'API key revoked successfully');

    // Verify in DB
    const key = await ApiKey.findByPk(adminKeyId);
    expect(key!.isActive).toBe(false);
  });

  it('should allow IT Admin to revoke any key (even if not owner)', async () => {
    // Create a second IT admin user to own the key, use the first to revoke
    const secondAdmin = await createTestUser('admin2@test.com', 'it_admin');

    // Create a key owned by secondAdmin
    const createRes = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${secondAdmin.token}`)
      .send({ name: 'Second Admin Key' });
    const secondKeyId = createRes.body.apiKey.id;

    // First IT admin revokes it
    const res = await request(app)
      .delete(`/api/keys/${secondKeyId}`)
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'API key revoked successfully');
  });

  it('should return 403 when non-owner, non-admin tries to revoke', async () => {
    const res = await request(app)
      .delete(`/api/keys/${adminKeyId}`)
      .set('Authorization', `Bearer ${testUsers.cSuite.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('should return 404 for a non-existent key', async () => {
    const res = await request(app)
      .delete('/api/keys/99999')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('should create an audit log entry after key revocation', async () => {
    await request(app)
      .delete(`/api/keys/${adminKeyId}`)
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    // Allow a brief moment for the async audit log to be written
    await new Promise((resolve) => setTimeout(resolve, 200));

    const logs = await AuditLog.findAll({
      where: { action: 'apikey.revoke', resource: 'api_key' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);
  });
});
