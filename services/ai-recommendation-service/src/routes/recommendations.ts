import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateFeedback } from '../middleware/validate';
import {
  listRecommendations,
  getRecommendation,
  submitFeedback,
} from '../controllers/recommendationController';

const router = Router();

// All recommendation routes require authentication
router.use(authenticate);

// POST /api/recommendations/feedback -- submit feedback (accept/dismiss)
// NOTE: this must be defined before /:id to avoid matching 'feedback' as an id
router.post('/feedback', validateFeedback, submitFeedback);

// GET /api/recommendations -- list recommendations
router.get('/', listRecommendations);

// GET /api/recommendations/:id -- get a single recommendation
router.get('/:id', getRecommendation);

export default router;
