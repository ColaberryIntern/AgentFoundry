import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { auditLog } from '../middleware/auditLog';
import { generateKey, listKeys, revokeKey } from '../controllers/apiKeyController';

const router = Router();

// Generate a new API key (IT Admin only, with audit logging)
router.post(
  '/',
  authenticate,
  authorize('manage_api_keys'),
  auditLog('apikey.generate', 'api_key'),
  generateKey,
);

// List API keys (any authenticated user sees their own; IT Admin can use ?all=true)
router.get('/', authenticate, listKeys);

// Revoke an API key (owner or IT Admin, with audit logging)
router.delete('/:id', authenticate, auditLog('apikey.revoke', 'api_key'), revokeKey);

export default router;
