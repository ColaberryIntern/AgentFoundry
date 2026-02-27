import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { eraseUserData, exportUserData, recordConsent } from '../controllers/gdprController';

const router = Router();

/**
 * DELETE /api/users/gdpr/:id/data
 * GDPR Right to Erasure — anonymizes user data and deletes associated records.
 * Requires authentication (own user or it_admin).
 */
router.delete('/:id/data', authenticate, eraseUserData);

/**
 * GET /api/users/gdpr/:id/data-export
 * GDPR Right to Access — exports all user data as JSON.
 * Requires authentication (own user or it_admin).
 */
router.get('/:id/data-export', authenticate, exportUserData);

/**
 * POST /api/users/gdpr/:id/consent
 * Records user consent with timestamp and scope.
 * Requires authentication (own user or it_admin).
 */
router.post('/:id/consent', authenticate, recordConsent);

export default router;
