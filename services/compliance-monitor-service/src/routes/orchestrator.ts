import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getDashboard,
  getIntents,
  getIntentById,
  approveIntent,
  rejectIntent,
  cancelIntent,
  getActions,
  getActionById,
  approveAction,
  rejectAction,
  getSettings,
  updateSetting,
  getViolations,
  resolveViolation,
  getScans,
  getMarketplace,
  createMarketplaceSubmission,
  reviewMarketplaceSubmission,
} from '../controllers/orchestratorController';

const router = Router();

// Dashboard
router.get('/dashboard', authenticate, getDashboard);

// Intents
router.get('/intents', authenticate, getIntents);
router.get('/intents/:id', authenticate, getIntentById);
router.post('/intents/:id/approve', authenticate, approveIntent);
router.post('/intents/:id/reject', authenticate, rejectIntent);
router.post('/intents/:id/cancel', authenticate, cancelIntent);

// Actions
router.get('/actions', authenticate, getActions);
router.get('/actions/:id', authenticate, getActionById);
router.post('/actions/:id/approve', authenticate, approveAction);
router.post('/actions/:id/reject', authenticate, rejectAction);

// Settings
router.get('/settings', authenticate, getSettings);
router.put('/settings/:key', authenticate, updateSetting);

// Guardrail Violations
router.get('/violations', authenticate, getViolations);
router.post('/violations/:id/resolve', authenticate, resolveViolation);

// Scan Log
router.get('/scans', authenticate, getScans);

// Marketplace
router.get('/marketplace', authenticate, getMarketplace);
router.post('/marketplace', authenticate, createMarketplaceSubmission);
router.put('/marketplace/:id/review', authenticate, reviewMarketplaceSubmission);

export default router;
