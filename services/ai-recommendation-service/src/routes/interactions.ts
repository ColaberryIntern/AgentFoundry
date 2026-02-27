import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  trackInteraction,
  trackBatchInteractions,
  getInteractionSummary,
} from '../controllers/interactionController';

const router = Router();

// All interaction routes require authentication
router.use(authenticate);

// POST /api/interactions — track a single interaction
router.post('/', trackInteraction);

// POST /api/interactions/batch — track multiple interactions at once
router.post('/batch', trackBatchInteractions);

// GET /api/interactions/summary/:userId — get user interaction summary
router.get('/summary/:userId', getInteractionSummary);

export default router;
