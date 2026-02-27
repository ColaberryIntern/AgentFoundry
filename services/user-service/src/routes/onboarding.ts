import { Router } from 'express';
import { validateAdvanceStep } from '../middleware/validate';
import {
  getProgress,
  advanceStep,
  skipOnboarding,
  resetOnboarding,
} from '../controllers/onboardingController';

const router = Router();

// GET  / — returns the authenticated user's onboarding progress
router.get('/', getProgress);

// POST /advance — marks current step as completed, advances to next
router.post('/advance', validateAdvanceStep, advanceStep);

// POST /skip — marks onboarding as skipped
router.post('/skip', skipOnboarding);

// POST /reset — resets onboarding progress to step 1
router.post('/reset', resetOnboarding);

export default router;
