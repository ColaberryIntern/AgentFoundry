import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getDashboard } from '../controllers/complianceController';

const router = Router();

// GET /api/dashboard — role-aware compliance dashboard
router.get('/', authenticate, getDashboard);

export default router;
