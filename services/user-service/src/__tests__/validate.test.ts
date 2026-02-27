import express from 'express';
import request from 'supertest';
import { validateRegistration, validateLogin } from '../middleware/validate';
import { errorHandler } from '../middleware/errorHandler';

/**
 * Creates a test app that uses the specified validation middleware
 * before a simple success handler.
 */
function createApp(middleware: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.post('/test', middleware, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('validateRegistration', () => {
  const app = createApp(validateRegistration);

  it('passes with valid registration data', async () => {
    const res = await request(app).post('/test').send({
      email: 'user@example.com',
      password: 'MyStr0ng!Pass',
      role: 'compliance_officer',
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects missing email', async () => {
    const res = await request(app)
      .post('/test')
      .send({ password: 'MyStr0ng!Pass', role: 'compliance_officer' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/test')
      .send({ email: 'not-an-email', password: 'MyStr0ng!Pass', role: 'compliance_officer' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing password', async () => {
    const res = await request(app)
      .post('/test')
      .send({ email: 'user@example.com', role: 'compliance_officer' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects weak password', async () => {
    const res = await request(app)
      .post('/test')
      .send({ email: 'user@example.com', password: 'weak', role: 'compliance_officer' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    // Should include password strength errors in details
    expect(res.body.error.details).toBeDefined();
  });

  it('rejects invalid role', async () => {
    const res = await request(app)
      .post('/test')
      .send({ email: 'user@example.com', password: 'MyStr0ng!Pass', role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('defaults role to compliance_officer when not provided', async () => {
    const res = await request(app)
      .post('/test')
      .send({ email: 'user@example.com', password: 'MyStr0ng!Pass' });

    expect(res.status).toBe(200);
  });

  it('accepts all valid roles', async () => {
    for (const role of ['c_suite', 'compliance_officer', 'it_admin']) {
      const res = await request(app)
        .post('/test')
        .send({ email: `${role}@example.com`, password: 'MyStr0ng!Pass', role });

      expect(res.status).toBe(200);
    }
  });
});

describe('validateLogin', () => {
  const app = createApp(validateLogin);

  it('passes with valid login data', async () => {
    const res = await request(app)
      .post('/test')
      .send({ email: 'user@example.com', password: 'anypassword' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects missing email', async () => {
    const res = await request(app).post('/test').send({ password: 'somepassword' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing password', async () => {
    const res = await request(app).post('/test').send({ email: 'user@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects empty email string', async () => {
    const res = await request(app).post('/test').send({ email: '', password: 'somepassword' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects empty password string', async () => {
    const res = await request(app).post('/test').send({ email: 'user@example.com', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
