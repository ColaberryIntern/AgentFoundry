import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { hasPermission, Permission } from '../config/permissions';

/**
 * Authorization middleware factory.
 *
 * Returns a middleware that checks whether the authenticated user's role
 * includes ALL of the specified permissions. If not, responds with 403.
 *
 * Must be used after the `authenticate` middleware (req.user must be set).
 *
 * Usage:
 *   router.get('/admin', authenticate, authorize('manage_users'), handler);
 */
export function authorize(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user || !user.role) {
      return next(AppError.forbidden('Insufficient permissions'));
    }

    const role = user.role;

    for (const permission of requiredPermissions) {
      if (!hasPermission(role, permission)) {
        return next(AppError.forbidden('Insufficient permissions'));
      }
    }

    next();
  };
}
