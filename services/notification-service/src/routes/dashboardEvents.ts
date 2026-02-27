import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  broadcastMetrics,
  broadcastActivity,
  broadcastCompliance,
} from '../controllers/dashboardEventsController';

const router = Router();

// All dashboard event endpoints require authentication (service-to-service auth)
router.post('/metrics', authenticate, broadcastMetrics);
router.post('/activity', authenticate, broadcastActivity);
router.post('/compliance', authenticate, broadcastCompliance);

export default router;
