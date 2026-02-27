import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

/**
 * Read JWT_SECRET at verification time so that tests can set it
 * via process.env before making requests.
 */
function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'default-jwt-secret';
}

/**
 * Authentication middleware.
 *
 * Extracts a JWT from the Authorization header (Bearer <token>),
 * verifies it, and attaches the decoded payload to req.user.
 *
 * Throws AppError.unauthorized() if the token is missing, malformed, or invalid.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or malformed authorization header');
    }

    const token = authHeader.slice(7); // strip "Bearer "

    if (!token) {
      throw AppError.unauthorized('Token not provided');
    }

    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      email?: string;
      role?: string;
    };

    (req as any).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      next(AppError.unauthorized('Invalid or expired token'));
    }
  }
}
