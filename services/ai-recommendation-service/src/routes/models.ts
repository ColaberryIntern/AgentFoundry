import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateRegisterModel, validateUpdateStatus } from '../middleware/validate';
import {
  listModels,
  getModel,
  registerModel,
  updateModelStatus,
  getModelMetrics,
} from '../controllers/modelController';

const router = Router();

// All model routes require authentication
router.use(authenticate);

// POST /api/models/register -- register a new model
router.post('/register', validateRegisterModel, registerModel);

// GET /api/models -- list registered models
router.get('/', listModels);

// PUT /api/models/:id/status -- update model status
router.put('/:id/status', validateUpdateStatus, updateModelStatus);

// GET /api/models/:id/metrics -- get model training metrics
router.get('/:id/metrics', getModelMetrics);

// GET /api/models/:id -- get model details
router.get('/:id', getModel);

export default router;
