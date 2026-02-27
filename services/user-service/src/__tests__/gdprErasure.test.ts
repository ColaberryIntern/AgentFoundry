import request from 'supertest';
import { app } from '../index';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import { generateAccessToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';

process.env.NODE_ENV = 'test';

let ownUser: User;
let otherUser: User;
let adminUser: User;
let ownToken: string;
let otherToken: string;
let adminToken: string;

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true });

  const passwordHash = await hashPassword('StrongP@ss1');

  ownUser = await User.create({
    email: 'own@example.com',
    passwordHash,
    role: 'compliance_officer',
    isVerified: true,
  });

  otherUser = await User.create({
    email: 'other@example.com',
    passwordHash,
    role: 'compliance_officer',
    isVerified: true,
  });

  adminUser = await User.create({
    email: 'admin@example.com',
    passwordHash,
    role: 'it_admin',
    isVerified: true,
  });

  ownToken = generateAccessToken(ownUser.id, ownUser.email, ownUser.role);
  otherToken = generateAccessToken(otherUser.id, otherUser.email, otherUser.role);
  adminToken = generateAccessToken(adminUser.id, adminUser.email, adminUser.role);
});

afterAll(async () => {
  await sequelize.close();
});

describe('DELETE /api/users/:id/data — GDPR Data Erasure', () => {
  it('should return 200 and erase data when user erases own data', async () => {
    const res = await request(app)
      .delete(`/api/users/${ownUser.id}/data`)
      .set('Authorization', `Bearer ${ownToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'User data erased successfully');

    // Verify the user data was erased in the database
    const updated = await User.findByPk(ownUser.id);
    expect(updated).not.toBeNull();
    expect(updated!.email).toBe(`deleted_${ownUser.id}@removed.local`);
    expect(updated!.passwordHash).toBe('');
    expect(updated!.isVerified).toBe(false);
    expect(updated!.role).toBe('compliance_officer');
    expect(updated!.verificationToken).toBeNull();
  });

  it("should return 200 when it_admin erases another user's data", async () => {
    const res = await request(app)
      .delete(`/api/users/${otherUser.id}/data`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'User data erased successfully');

    // Verify the target user data was erased
    const updated = await User.findByPk(otherUser.id);
    expect(updated!.email).toBe(`deleted_${otherUser.id}@removed.local`);
    expect(updated!.passwordHash).toBe('');
  });

  it("should return 403 when non-admin tries to erase another user's data", async () => {
    const res = await request(app)
      .delete(`/api/users/${ownUser.id}/data`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');

    // Verify the target user data was NOT erased
    const unchanged = await User.findByPk(ownUser.id);
    expect(unchanged!.email).toBe('own@example.com');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).delete(`/api/users/${ownUser.id}/data`);

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 404 when target user does not exist', async () => {
    const res = await request(app)
      .delete('/api/users/99999/data')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
