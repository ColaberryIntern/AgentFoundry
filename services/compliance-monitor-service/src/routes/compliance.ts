import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateCreateMonitor, validateUpdateStatus } from '../middleware/validate';
import {
  createMonitor,
  getComplianceSummary,
  getComplianceByUser,
  updateComplianceStatus,
} from '../controllers/complianceController';

const router = Router();

// POST /api/compliance/monitor — create a new compliance monitor
router.post('/monitor', authenticate, validateCreateMonitor, createMonitor);

// GET /api/compliance/summary — aggregate compliance summary (must be before :userId)
router.get('/summary', authenticate, getComplianceSummary);

// GET /api/compliance/:userId — compliance records for a specific user
router.get('/:userId', authenticate, getComplianceByUser);

// PUT /api/compliance/:id/status — update compliance record status
router.put('/:id/status', authenticate, validateUpdateStatus, updateComplianceStatus);

export default router;
