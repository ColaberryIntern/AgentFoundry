import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models/User';
import { ROLE_PERMISSIONS, getPermissionsForRole } from '../config/permissions';
import { AppError } from '../utils/AppError';

const VALID_ROLES: UserRole[] = ['c_suite', 'compliance_officer', 'it_admin'];

/**
 * GET /api/roles
 *
 * Returns all three roles with their associated permissions.
 */
export async function listRoles(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roles = Object.entries(ROLE_PERMISSIONS).map(([name, permissions]) => ({
      name,
      permissions: [...permissions],
    }));

    res.status(200).json({ roles });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/roles/users/:id
 *
 * Returns a specific user's role and the permissions associated with it.
 */
export async function getUserPermissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = parseInt(rawId, 10);

    if (isNaN(userId)) {
      throw AppError.badRequest('Invalid user ID');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const permissions = getPermissionsForRole(user.role);

    res.status(200).json({
      userId: user.id,
      role: user.role,
      permissions,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/roles/users/:id
 *
 * Assigns a new role to a user. Only IT Admin can perform this action
 * (enforced by authorize middleware). Self-demotion is prevented.
 */
export async function assignRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawTargetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const targetUserId = parseInt(rawTargetId, 10);
    const { role: newRole } = req.body;

    if (isNaN(targetUserId)) {
      throw AppError.badRequest('Invalid user ID');
    }

    // Validate role is a valid enum value
    if (!newRole || !VALID_ROLES.includes(newRole as UserRole)) {
      throw AppError.badRequest(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    }

    // Prevent self-demotion / self-role-change
    if (req.user?.userId === targetUserId) {
      throw AppError.badRequest('Cannot change your own role');
    }

    // Find the target user
    const user = await User.findByPk(targetUserId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Update the role
    user.role = newRole as UserRole;
    await user.save();

    res.status(200).json({
      user: user.toSafeJSON(),
      message: 'Role updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/roles/users
 *
 * Lists all users with pagination. Only IT Admin can access
 * (enforced by authorize middleware).
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 20)
 */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const { count: total, rows: users } = await User.findAndCountAll({
      attributes: { exclude: ['passwordHash', 'verificationToken'] },
      order: [['id', 'ASC']],
      limit,
      offset,
    });

    res.status(200).json({
      users: users.map((u) => u.toSafeJSON()),
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}
