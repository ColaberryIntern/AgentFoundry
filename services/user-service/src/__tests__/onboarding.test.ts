import request from 'supertest';
import { app } from '../index';
import { sequelize } from '../config/database';
import { User, OnboardingProgress } from '../models';
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
    email: 'onboarding-user@test.com',
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
  await OnboardingProgress.destroy({ where: {} });
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
// GET /api/users/onboarding
// ─────────────────────────────────────────────────────────
describe('GET /api/users/onboarding', () => {
  it('should return 200 and create default progress (step 1, not complete)', async () => {
    const res = await request(app)
      .get('/api/users/onboarding')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('progress');
    expect(res.body.progress).toHaveProperty('currentStep', 1);
    expect(res.body.progress).toHaveProperty('isComplete', false);
    expect(res.body.progress).toHaveProperty('completedSteps');
    expect(res.body.progress.completedSteps).toEqual([]);
    expect(res.body.progress).toHaveProperty('userId', testUserId);
  });

  it('should return 200 and return existing progress', async () => {
    // Seed an onboarding progress record
    await OnboardingProgress.create({
      userId: testUserId,
      currentStep: 3,
      completedSteps: [1, 2],
      isComplete: false,
    });

    const res = await request(app)
      .get('/api/users/onboarding')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.progress).toHaveProperty('currentStep', 3);
    expect(res.body.progress.completedSteps).toEqual([1, 2]);
    expect(res.body.progress).toHaveProperty('isComplete', false);
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).get('/api/users/onboarding');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

// ─────────────────────────────────────────────────────────
// POST /api/users/onboarding/advance
// ─────────────────────────────────────────────────────────
describe('POST /api/users/onboarding/advance', () => {
  it('should return 200 and advance from step 1 to step 2', async () => {
    const res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 1 });

    expect(res.status).toBe(200);
    expect(res.body.progress).toHaveProperty('currentStep', 2);
    expect(res.body.progress.completedSteps).toContain(1);
    expect(res.body.progress).toHaveProperty('isComplete', false);
  });

  it('should return 200 and advance from step 2 to step 3', async () => {
    // Advance to step 2 first
    await OnboardingProgress.create({
      userId: testUserId,
      currentStep: 2,
      completedSteps: [1],
      isComplete: false,
    });

    const res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 2 });

    expect(res.status).toBe(200);
    expect(res.body.progress).toHaveProperty('currentStep', 3);
    expect(res.body.progress.completedSteps).toEqual([1, 2]);
  });

  it('should return 400 when step does not match current step (step mismatch)', async () => {
    const res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 3 });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 200 and mark complete when step 6 is completed', async () => {
    await OnboardingProgress.create({
      userId: testUserId,
      currentStep: 6,
      completedSteps: [1, 2, 3, 4, 5],
      isComplete: false,
    });

    const res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 6 });

    expect(res.status).toBe(200);
    expect(res.body.progress).toHaveProperty('isComplete', true);
    expect(res.body.progress.completedSteps).toEqual([1, 2, 3, 4, 5, 6]);
    expect(res.body.progress.completedAt).not.toBeNull();
  });

  it('should return 400 when trying to advance after onboarding is already complete', async () => {
    await OnboardingProgress.create({
      userId: testUserId,
      currentStep: 6,
      completedSteps: [1, 2, 3, 4, 5, 6],
      isComplete: true,
      completedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).post('/api/users/onboarding/advance').send({ step: 1 });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 400 for invalid step value (validation error)', async () => {
    const res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────
// POST /api/users/onboarding/skip
// ─────────────────────────────────────────────────────────
describe('POST /api/users/onboarding/skip', () => {
  it('should return 200 and mark onboarding as skipped', async () => {
    const res = await request(app)
      .post('/api/users/onboarding/skip')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.progress).toHaveProperty('isComplete', true);
    expect(res.body.progress.skippedAt).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────
// POST /api/users/onboarding/reset
// ─────────────────────────────────────────────────────────
describe('POST /api/users/onboarding/reset', () => {
  it('should return 200 and reset onboarding to step 1', async () => {
    // First advance to step 3
    await OnboardingProgress.create({
      userId: testUserId,
      currentStep: 3,
      completedSteps: [1, 2],
      isComplete: false,
    });

    const res = await request(app)
      .post('/api/users/onboarding/reset')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.progress).toHaveProperty('currentStep', 1);
    expect(res.body.progress.completedSteps).toEqual([]);
    expect(res.body.progress).toHaveProperty('isComplete', false);
    expect(res.body.progress.skippedAt).toBeNull();
    expect(res.body.progress.completedAt).toBeNull();
  });

  it('should allow advancing again after reset', async () => {
    // Set up a completed onboarding
    await OnboardingProgress.create({
      userId: testUserId,
      currentStep: 6,
      completedSteps: [1, 2, 3, 4, 5, 6],
      isComplete: true,
      completedAt: new Date(),
    });

    // Reset
    const resetRes = await request(app)
      .post('/api/users/onboarding/reset')
      .set('Authorization', `Bearer ${testToken}`);

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.progress).toHaveProperty('currentStep', 1);
    expect(resetRes.body.progress).toHaveProperty('isComplete', false);

    // Now advance again — should work
    const advanceRes = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 1 });

    expect(advanceRes.status).toBe(200);
    expect(advanceRes.body.progress).toHaveProperty('currentStep', 2);
    expect(advanceRes.body.progress.completedSteps).toEqual([1]);
  });
});

// ─────────────────────────────────────────────────────────
// Full journey — completed steps accumulate correctly
// ─────────────────────────────────────────────────────────
describe('Full onboarding journey', () => {
  it('should accumulate completed steps correctly through all 6 steps', async () => {
    // Step 1
    let res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 1 });
    expect(res.status).toBe(200);
    expect(res.body.progress.completedSteps).toEqual([1]);
    expect(res.body.progress.currentStep).toBe(2);

    // Step 2
    res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 2 });
    expect(res.status).toBe(200);
    expect(res.body.progress.completedSteps).toEqual([1, 2]);
    expect(res.body.progress.currentStep).toBe(3);

    // Step 3
    res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 3 });
    expect(res.status).toBe(200);
    expect(res.body.progress.completedSteps).toEqual([1, 2, 3]);
    expect(res.body.progress.currentStep).toBe(4);

    // Step 4
    res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 4 });
    expect(res.status).toBe(200);
    expect(res.body.progress.completedSteps).toEqual([1, 2, 3, 4]);
    expect(res.body.progress.currentStep).toBe(5);

    // Step 5
    res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 5 });
    expect(res.status).toBe(200);
    expect(res.body.progress.completedSteps).toEqual([1, 2, 3, 4, 5]);
    expect(res.body.progress.currentStep).toBe(6);

    // Step 6 — final
    res = await request(app)
      .post('/api/users/onboarding/advance')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ step: 6 });
    expect(res.status).toBe(200);
    expect(res.body.progress.completedSteps).toEqual([1, 2, 3, 4, 5, 6]);
    expect(res.body.progress.isComplete).toBe(true);
    expect(res.body.progress.completedAt).not.toBeNull();

    // Verify final state via GET
    const getRes = await request(app)
      .get('/api/users/onboarding')
      .set('Authorization', `Bearer ${testToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.progress.completedSteps).toEqual([1, 2, 3, 4, 5, 6]);
    expect(getRes.body.progress.isComplete).toBe(true);
  });
});
