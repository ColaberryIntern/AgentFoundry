import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  validateComplianceGaps,
  validateRegulatoryPredictions,
  validateDriftAnalysis,
  validateOptimizeDeployment,
  validateMarketSignals,
  validateClassifyRegulations,
} from '../middleware/validate';
import {
  complianceGaps,
  regulatoryPredictions,
  driftAnalysis,
  optimizeDeployment,
  marketSignals,
  classifyRegulations,
  inferenceHealth,
} from '../controllers/inferenceController';

const router = Router();

// All inference routes require authentication
router.use(authenticate);

// POST /api/inference/compliance-gaps -- run compliance gap analysis
router.post('/compliance-gaps', validateComplianceGaps, complianceGaps);

// POST /api/inference/regulatory-predictions -- run regulatory predictions
router.post('/regulatory-predictions', validateRegulatoryPredictions, regulatoryPredictions);

// POST /api/inference/drift-analysis -- run drift analysis
router.post('/drift-analysis', validateDriftAnalysis, driftAnalysis);

// POST /api/inference/optimize-deployment -- run deployment optimisation
router.post('/optimize-deployment', validateOptimizeDeployment, optimizeDeployment);

// POST /api/inference/market-signals -- run market signal predictions
router.post('/market-signals', validateMarketSignals, marketSignals);

// POST /api/inference/classify-regulations -- run regulation taxonomy classification
router.post('/classify-regulations', validateClassifyRegulations, classifyRegulations);

// GET /api/inference/health -- check model server health
router.get('/health', inferenceHealth);

export default router;
