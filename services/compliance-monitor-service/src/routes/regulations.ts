import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getRegulatoryPredictions } from '../controllers/complianceController';

const router = Router();

// GET /api/regulations/predictions — AI-powered regulatory predictions
router.get('/predictions', authenticate, getRegulatoryPredictions);

export default router;
