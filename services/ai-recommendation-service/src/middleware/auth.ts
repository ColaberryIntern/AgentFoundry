import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      email?: string;
      role?: string;
    };
  }
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'default-jwt-secret';
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or malformed authorization header');
    }

    const token = authHeader.slice(7);

    if (!token) {
      throw AppError.unauthorized('Token not provided');
    }

    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      email?: string;
      role?: string;
    };

    req.user = {
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
