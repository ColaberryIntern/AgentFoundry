import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateSubmitFeedback } from '../middleware/validateFeedback';
import { submitFeedback, listFeedback, getFeedbackStats } from '../controllers/feedbackController';

const router = Router();

/**
 * POST /api/feedback
 * Submit user feedback.
 * Requires authentication.
 */
router.post('/', authenticate, validateSubmitFeedback, submitFeedback);

/**
 * GET /api/feedback/stats
 * Returns feedback statistics (counts by category, average rating, total).
 * Requires authentication (IT Admin only).
 * NOTE: This route must be defined BEFORE the GET / route to avoid conflicts.
 */
router.get('/stats', authenticate, getFeedbackStats);

/**
 * GET /api/feedback
 * Returns paginated feedback list.
 * Requires authentication (IT Admin only).
 * Supports ?category filter.
 */
router.get('/', authenticate, listFeedback);

export default router;
