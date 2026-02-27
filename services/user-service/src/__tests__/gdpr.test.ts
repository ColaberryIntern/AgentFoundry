/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';

import request from 'supertest';
import { app } from '../index';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import { UserPreference } from '../models/UserPreference';
import { ConsentRecord } from '../models/ConsentRecord';
import { generateAccessToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';

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
  // Clear all tables
  await ConsentRecord.destroy({ where: {}, truncate: true });
  await UserPreference.destroy({ where: {}, truncate: true });
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

// ---------------------------------------------------------------------------
// GET /api/users/gdpr/:id/data-export — GDPR Data Export
// ---------------------------------------------------------------------------
describe('GET /api/users/gdpr/:id/data-export — GDPR Data Export', () => {
  it('should return 200 with complete user data when user exports own data', async () => {
    // Create some associated data
    await UserPreference.create({ userId: ownUser.id });
    await ConsentRecord.create({
      userId: ownUser.id,
      scope: 'marketing',
      granted: true,
    });

    const res = await request(app)
      .get(`/api/users/gdpr/${ownUser.id}/data-export`)
      .set('Authorization', `Bearer ${ownToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', 'own@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body).toHaveProperty('preferences');
    expect(res.body).toHaveProperty('consentRecords');
    expect(res.body.consentRecords).toHaveLength(1);
    expect(res.body).toHaveProperty('exportedAt');
  });

  it('should return 200 when it_admin exports another user data', async () => {
    const res = await request(app)
      .get(`/api/users/gdpr/${otherUser.id}/data-export`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('email', 'other@example.com');
  });

  it('should return 403 when non-admin tries to export another user data', async () => {
    const res = await request(app)
      .get(`/api/users/gdpr/${ownUser.id}/data-export`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).get(`/api/users/gdpr/${ownUser.id}/data-export`);

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 404 when user does not exist', async () => {
    const res = await request(app)
      .get('/api/users/gdpr/99999/data-export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('should include empty arrays when no associated data exists', async () => {
    const res = await request(app)
      .get(`/api/users/gdpr/${ownUser.id}/data-export`)
      .set('Authorization', `Bearer ${ownToken}`);

    expect(res.status).toBe(200);
    expect(res.body.preferences).toBeNull();
    expect(res.body.consentRecords).toEqual([]);
    expect(res.body.auditLogs).toEqual([]);
    expect(res.body.apiKeys).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/users/gdpr/:id/data — GDPR Data Erasure
// ---------------------------------------------------------------------------
describe('DELETE /api/users/gdpr/:id/data — GDPR Data Erasure', () => {
  it('should return 200 and anonymize data when user erases own data', async () => {
    // Create some associated data
    await UserPreference.create({ userId: ownUser.id });
    await ConsentRecord.create({
      userId: ownUser.id,
      scope: 'analytics',
      granted: true,
    });

    const res = await request(app)
      .delete(`/api/users/gdpr/${ownUser.id}/data`)
      .set('Authorization', `Bearer ${ownToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'User data erased successfully');

    // Verify user data was anonymized
    const updated = await User.findByPk(ownUser.id);
    expect(updated).not.toBeNull();
    expect(updated!.email).toBe(`deleted_${ownUser.id}@removed.local`);
    expect(updated!.passwordHash).toBe('');
    expect(updated!.isVerified).toBe(false);
    expect(updated!.verificationToken).toBeNull();

    // Verify associated records were deleted
    const prefs = await UserPreference.findOne({ where: { userId: ownUser.id } });
    expect(prefs).toBeNull();

    const consents = await ConsentRecord.findAll({ where: { userId: ownUser.id } });
    expect(consents).toHaveLength(0);
  });

  it('should return 200 when it_admin erases another user data', async () => {
    const res = await request(app)
      .delete(`/api/users/gdpr/${otherUser.id}/data`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'User data erased successfully');

    const updated = await User.findByPk(otherUser.id);
    expect(updated!.email).toBe(`deleted_${otherUser.id}@removed.local`);
  });

  it('should return 403 when non-admin tries to erase another user data', async () => {
    const res = await request(app)
      .delete(`/api/users/gdpr/${ownUser.id}/data`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');

    // Verify data was NOT erased
    const unchanged = await User.findByPk(ownUser.id);
    expect(unchanged!.email).toBe('own@example.com');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).delete(`/api/users/gdpr/${ownUser.id}/data`);

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 404 when target user does not exist', async () => {
    const res = await request(app)
      .delete('/api/users/gdpr/99999/data')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// POST /api/users/gdpr/:id/consent — Consent Recording
// ---------------------------------------------------------------------------
describe('POST /api/users/gdpr/:id/consent — Consent Recording', () => {
  it('should return 201 and record consent for own user', async () => {
    const res = await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send({ scope: 'marketing', granted: true });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Consent recorded successfully');
    expect(res.body.consent).toHaveProperty('scope', 'marketing');
    expect(res.body.consent).toHaveProperty('granted', true);
    expect(res.body.consent).toHaveProperty('userId', ownUser.id);

    // Verify in database
    const records = await ConsentRecord.findAll({ where: { userId: ownUser.id } });
    expect(records).toHaveLength(1);
    expect(records[0].scope).toBe('marketing');
    expect(records[0].granted).toBe(true);
  });

  it('should record consent withdrawal (granted=false)', async () => {
    const res = await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send({ scope: 'analytics', granted: false });

    expect(res.status).toBe(201);
    expect(res.body.consent).toHaveProperty('granted', false);
  });

  it('should allow it_admin to record consent for another user', async () => {
    const res = await request(app)
      .post(`/api/users/gdpr/${otherUser.id}/consent`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scope: 'data_processing', granted: true });

    expect(res.status).toBe(201);
    expect(res.body.consent).toHaveProperty('userId', otherUser.id);
  });

  it('should return 403 when non-admin tries to record consent for another user', async () => {
    const res = await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ scope: 'marketing', granted: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .send({ scope: 'marketing', granted: true });

    expect(res.status).toBe(401);
  });

  it('should return 400 when scope is missing', async () => {
    const res = await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send({ granted: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when granted is missing', async () => {
    const res = await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send({ scope: 'marketing' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when granted is not a boolean', async () => {
    const res = await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send({ scope: 'marketing', granted: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 404 when user does not exist', async () => {
    const res = await request(app)
      .post('/api/users/gdpr/99999/consent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scope: 'marketing', granted: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('should allow multiple consent records for the same user', async () => {
    await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send({ scope: 'marketing', granted: true });

    await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send({ scope: 'analytics', granted: false });

    // Update marketing consent
    await request(app)
      .post(`/api/users/gdpr/${ownUser.id}/consent`)
      .set('Authorization', `Bearer ${ownToken}`)
      .send({ scope: 'marketing', granted: false });

    const records = await ConsentRecord.findAll({
      where: { userId: ownUser.id },
      order: [['createdAt', 'ASC']],
    });

    expect(records).toHaveLength(3);
    expect(records[0].scope).toBe('marketing');
    expect(records[0].granted).toBe(true);
    expect(records[2].scope).toBe('marketing');
    expect(records[2].granted).toBe(false);
  });
});
