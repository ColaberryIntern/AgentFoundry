import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateTrackEvent, validateTrackBatch } from '../middleware/validateAnalytics';
import {
  trackEvent,
  trackBatch,
  getEngagementStats,
  getUserActivity,
} from '../controllers/analyticsController';

const router = Router();

/**
 * POST /api/analytics/event
 * Track a single engagement event.
 * Requires authentication.
 */
router.post('/event', authenticate, validateTrackEvent, trackEvent);

/**
 * POST /api/analytics/events
 * Track multiple engagement events in batch.
 * Requires authentication.
 */
router.post('/events', authenticate, validateTrackBatch, trackBatch);

/**
 * GET /api/analytics/stats
 * Returns engagement metrics.
 * Requires authentication (IT Admin only).
 */
router.get('/stats', authenticate, getEngagementStats);

/**
 * GET /api/analytics/users/:userId/activity
 * Returns a specific user's recent events.
 * Requires authentication (IT Admin or own user).
 */
router.get('/users/:userId/activity', authenticate, getUserActivity);

export default router;
