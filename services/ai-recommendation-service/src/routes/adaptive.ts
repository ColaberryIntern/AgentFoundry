import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getAdaptivePreferences } from '../controllers/adaptiveController';

const router = Router();

// All adaptive routes require authentication
router.use(authenticate);

// GET /api/adaptive/preferences/:userId — get personalized preferences
router.get('/preferences/:userId', getAdaptivePreferences);

export default router;
