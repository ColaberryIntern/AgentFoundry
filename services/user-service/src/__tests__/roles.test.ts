import request from 'supertest';
import { app } from '../index';
import { sequelize } from '../config/database';
import { User, ApiKey, AuditLog } from '../models';
import { generateAccessToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';
import { ROLE_PERMISSIONS } from '../config/permissions';
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

  // Seed test users for each role
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
// Role Listing
// ─────────────────────────────────────────────────────────
describe('GET /api/roles', () => {
  it('should return 200 with all three roles and their permissions', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('roles');
    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(res.body.roles).toHaveLength(3);

    const roleNames = res.body.roles.map((r: { name: string }) => r.name);
    expect(roleNames).toContain('c_suite');
    expect(roleNames).toContain('compliance_officer');
    expect(roleNames).toContain('it_admin');

    // Check that each role has the correct permissions
    for (const role of res.body.roles) {
      const expected = ROLE_PERMISSIONS[role.name as UserRole];
      expect(role.permissions).toEqual(expect.arrayContaining(expected));
      expect(role.permissions).toHaveLength(expected.length);
    }
  });

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/roles');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

// ─────────────────────────────────────────────────────────
// User Listing (IT Admin only)
// ─────────────────────────────────────────────────────────
describe('GET /api/roles/users', () => {
  it('should return 200 with paginated users when requested by IT Admin', async () => {
    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.total).toBe(3); // Three test users
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it('should return 403 when requested by C-Suite', async () => {
    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${testUsers.cSuite.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('should return 403 when requested by Compliance Officer', async () => {
    const res = await request(app)
      .get('/api/roles/users')
      .set('Authorization', `Bearer ${testUsers.complianceOfficer.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('should respect pagination parameters', async () => {
    const res = await request(app)
      .get('/api/roles/users?page=1&limit=2')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  it('should return correct second page with pagination', async () => {
    const res = await request(app)
      .get('/api/roles/users?page=2&limit=2')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1); // Only 1 user on second page (3 total, limit 2)
    expect(res.body.page).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────
// Permission Checking
// ─────────────────────────────────────────────────────────
describe('GET /api/roles/users/:id', () => {
  it('should return 200 with user permissions when requested by IT Admin', async () => {
    const res = await request(app)
      .get(`/api/roles/users/${testUsers.cSuite.id}`)
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId', testUsers.cSuite.id);
    expect(res.body).toHaveProperty('role', 'c_suite');
    expect(res.body).toHaveProperty('permissions');
    expect(Array.isArray(res.body.permissions)).toBe(true);

    const expected = ROLE_PERMISSIONS['c_suite'];
    expect(res.body.permissions).toEqual(expect.arrayContaining(expected));
    expect(res.body.permissions).toHaveLength(expected.length);
  });

  it('should return 404 for a non-existent user', async () => {
    const res = await request(app)
      .get('/api/roles/users/99999')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});

// ─────────────────────────────────────────────────────────
// Role Assignment
// ─────────────────────────────────────────────────────────
describe('PUT /api/roles/users/:id', () => {
  it('should update a user role when requested by IT Admin with a valid role', async () => {
    const res = await request(app)
      .put(`/api/roles/users/${testUsers.complianceOfficer.id}`)
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ role: 'c_suite' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('role', 'c_suite');
    expect(res.body).toHaveProperty('message', 'Role updated successfully');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    // Verify in DB
    const user = await User.findByPk(testUsers.complianceOfficer.id);
    expect(user!.role).toBe('c_suite');
  });

  it('should return 403 when requested by C-Suite', async () => {
    const res = await request(app)
      .put(`/api/roles/users/${testUsers.complianceOfficer.id}`)
      .set('Authorization', `Bearer ${testUsers.cSuite.token}`)
      .send({ role: 'it_admin' });

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('should return 400 for an invalid role value', async () => {
    const res = await request(app)
      .put(`/api/roles/users/${testUsers.complianceOfficer.id}`)
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when IT Admin tries to change their own role', async () => {
    const res = await request(app)
      .put(`/api/roles/users/${testUsers.itAdmin.id}`)
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ role: 'c_suite' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 404 when target user does not exist', async () => {
    const res = await request(app)
      .put('/api/roles/users/99999')
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ role: 'c_suite' });

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('should create an audit log entry after role assignment', async () => {
    await request(app)
      .put(`/api/roles/users/${testUsers.complianceOfficer.id}`)
      .set('Authorization', `Bearer ${testUsers.itAdmin.token}`)
      .send({ role: 'c_suite' });

    // Allow a brief moment for the async audit log to be written
    await new Promise((resolve) => setTimeout(resolve, 200));

    const logs = await AuditLog.findAll({
      where: { action: 'role.assign', resource: 'user' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.userId).toBe(testUsers.itAdmin.id);
    expect(log.resourceId).toBe(String(testUsers.complianceOfficer.id));
  });
});
