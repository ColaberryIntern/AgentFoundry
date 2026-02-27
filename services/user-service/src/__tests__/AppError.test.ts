import { AppError } from '../utils/AppError';

describe('AppError', () => {
  it('is an instance of Error', () => {
    const err = new AppError('test', 500, 'TEST_ERROR');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('stores message, statusCode, code, and isOperational', () => {
    const err = new AppError('Something broke', 500, 'INTERNAL_ERROR', undefined, false);
    expect(err.message).toBe('Something broke');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(false);
  });

  it('defaults isOperational to true', () => {
    const err = new AppError('oops', 400, 'VALIDATION_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('stores optional details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const err = new AppError('bad input', 400, 'VALIDATION_ERROR', details);
    expect(err.details).toEqual(details);
  });

  it('has a stack trace', () => {
    const err = new AppError('traced', 500, 'TRACE_TEST');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AppError.test.ts');
  });
});

describe('AppError.badRequest', () => {
  it('creates a 400 error with VALIDATION_ERROR code', () => {
    const err = AppError.badRequest('Invalid email');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Invalid email');
    expect(err.isOperational).toBe(true);
  });

  it('accepts optional details', () => {
    const details = { fields: ['email', 'password'] };
    const err = AppError.badRequest('Validation failed', details);
    expect(err.details).toEqual(details);
  });
});

describe('AppError.unauthorized', () => {
  it('creates a 401 error with default message', () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Unauthorized');
  });

  it('accepts a custom message', () => {
    const err = AppError.unauthorized('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('AppError.forbidden', () => {
  it('creates a 403 error with default message', () => {
    const err = AppError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Forbidden');
  });
});

describe('AppError.notFound', () => {
  it('creates a 404 error with default message', () => {
    const err = AppError.notFound();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
  });
});

describe('AppError.conflict', () => {
  it('creates a 409 error', () => {
    const err = AppError.conflict('Email already registered');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('Email already registered');
  });

  it('accepts optional details', () => {
    const err = AppError.conflict('Duplicate', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });
});
