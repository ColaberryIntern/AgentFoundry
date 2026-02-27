import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateComplianceGaps, validateRegulatoryPredictions } from '../middleware/validate';
import {
  complianceGaps,
  regulatoryPredictions,
  inferenceHealth,
} from '../controllers/inferenceController';

const router = Router();

// All inference routes require authentication
router.use(authenticate);

// POST /api/inference/compliance-gaps -- run compliance gap analysis
router.post('/compliance-gaps', validateComplianceGaps, complianceGaps);

// POST /api/inference/regulatory-predictions -- run regulatory predictions
router.post('/regulatory-predictions', validateRegulatoryPredictions, regulatoryPredictions);

// GET /api/inference/health -- check model server health
router.get('/health', inferenceHealth);

export default router;
