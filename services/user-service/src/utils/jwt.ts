import jwt from 'jsonwebtoken';

/**
 * Retrieves the JWT signing secret from environment variables.
 * Falls back to a test-only default when JWT_SECRET is not set.
 */
function getSecret(): string {
  return process.env.JWT_SECRET || 'fallback-test-secret-do-not-use-in-production';
}

export interface AccessTokenPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: number;
  type: string;
  iat: number;
  exp: number;
}

/**
 * Generates a short-lived access token (15 minutes).
 */
export function generateAccessToken(userId: number, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, getSecret(), { expiresIn: '15m', algorithm: 'HS256' });
}

/**
 * Generates a long-lived refresh token (7 days).
 */
export function generateRefreshToken(userId: number): string {
  return jwt.sign({ userId, type: 'refresh' }, getSecret(), {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

/**
 * Verifies and decodes a JWT token.
 * Throws if the token is invalid, expired, or tampered with.
 */
export function verifyToken(token: string): AccessTokenPayload | RefreshTokenPayload {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as
    | AccessTokenPayload
    | RefreshTokenPayload;
}
