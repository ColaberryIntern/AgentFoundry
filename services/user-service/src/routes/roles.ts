import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { auditLog } from '../middleware/auditLog';
import {
  listRoles,
  listUsers,
  getUserPermissions,
  assignRole,
} from '../controllers/roleController';

const router = Router();

// List all roles with their permissions (any authenticated user)
router.get('/', authenticate, listRoles);

// List all users (IT Admin only — requires manage_users permission)
router.get('/users', authenticate, authorize('manage_users'), listUsers);

// Get a specific user's role and permissions (IT Admin only)
router.get('/users/:id', authenticate, authorize('manage_users'), getUserPermissions);

// Assign a role to a user (IT Admin only, with audit logging)
router.put(
  '/users/:id',
  authenticate,
  authorize('manage_users'),
  auditLog('role.assign', 'user'),
  assignRole,
);

export default router;
