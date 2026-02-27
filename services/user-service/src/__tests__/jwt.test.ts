import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  AccessTokenPayload,
} from '../utils/jwt';

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

// Ensure tests use the test secret
beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

describe('generateAccessToken', () => {
  it('returns a valid JWT string', () => {
    const token = generateAccessToken(1, 'user@example.com', 'compliance_officer');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('contains correct payload fields (userId, email, role)', () => {
    const token = generateAccessToken(42, 'admin@test.com', 'c_suite');
    const decoded = jwt.verify(token, TEST_SECRET) as Record<string, unknown>;

    expect(decoded.userId).toBe(42);
    expect(decoded.email).toBe('admin@test.com');
    expect(decoded.role).toBe('c_suite');
  });

  it('has a 15-minute expiry', () => {
    const token = generateAccessToken(1, 'user@example.com', 'it_admin');
    const decoded = jwt.verify(token, TEST_SECRET) as Record<string, unknown>;

    const exp = decoded.exp as number;
    const iat = decoded.iat as number;
    // 15 minutes = 900 seconds
    expect(exp - iat).toBe(900);
  });
});

describe('generateRefreshToken', () => {
  it('returns a valid JWT string', () => {
    const token = generateRefreshToken(1);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('has a 7-day expiry', () => {
    const token = generateRefreshToken(1);
    const decoded = jwt.verify(token, TEST_SECRET) as Record<string, unknown>;

    const exp = decoded.exp as number;
    const iat = decoded.iat as number;
    // 7 days = 604800 seconds
    expect(exp - iat).toBe(604800);
  });

  it('contains userId in payload', () => {
    const token = generateRefreshToken(99);
    const decoded = jwt.verify(token, TEST_SECRET) as Record<string, unknown>;

    expect(decoded.userId).toBe(99);
  });
});

describe('verifyToken', () => {
  it('decodes a valid token and returns the payload', () => {
    const token = generateAccessToken(5, 'test@test.com', 'compliance_officer');
    const payload = verifyToken(token) as AccessTokenPayload;

    expect(payload.userId).toBe(5);
    expect(payload.email).toBe('test@test.com');
    expect(payload.role).toBe('compliance_officer');
  });

  it('throws on expired token', () => {
    // Create a token that is already expired
    const token = jwt.sign({ userId: 1, email: 'old@test.com', role: 'it_admin' }, TEST_SECRET, {
      expiresIn: '0s',
    });

    // Small delay to ensure the token is expired
    expect(() => verifyToken(token)).toThrow();
  });

  it('throws on invalid token', () => {
    expect(() => verifyToken('invalid.token.string')).toThrow();
  });

  it('throws on token signed with wrong secret', () => {
    const token = jwt.sign({ userId: 1 }, 'wrong-secret', { expiresIn: '15m' });
    expect(() => verifyToken(token)).toThrow();
  });
});
