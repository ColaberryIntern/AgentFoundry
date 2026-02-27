import { Request, Response, NextFunction } from 'express';
import { OnboardingProgress } from '../models/OnboardingProgress';
import { AppError } from '../utils/AppError';

/**
 * The 6 onboarding steps:
 * 1. Welcome
 * 2. Dashboard tour
 * 3. First compliance check
 * 4. Sample report
 * 5. Notification preferences
 * 6. Search tutorial
 */
const MAX_STEP = 6;

/**
 * GET /api/users/onboarding
 *
 * Returns the authenticated user's onboarding progress.
 * If no progress record exists yet, creates one with default values.
 */
export async function getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const [progress] = await OnboardingProgress.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        currentStep: 1,
        completedSteps: [],
        isComplete: false,
      },
    });

    res.status(200).json({ progress });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/onboarding/advance
 *
 * Marks the current step as completed and advances to the next step.
 * Body: { step: number }
 * Validates that step matches currentStep.
 * If step 6 is completed, sets isComplete=true and completedAt.
 */
export async function advanceStep(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { step } = req.body;

    const [progress] = await OnboardingProgress.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        currentStep: 1,
        completedSteps: [],
        isComplete: false,
      },
    });

    if (progress.isComplete) {
      throw AppError.badRequest('Onboarding is already complete');
    }

    if (step !== progress.currentStep) {
      throw AppError.badRequest(
        `Step mismatch: expected step ${progress.currentStep}, received step ${step}`,
      );
    }

    // Mark the step as completed
    const updatedCompletedSteps = [...progress.completedSteps, step];
    progress.completedSteps = updatedCompletedSteps;

    if (step >= MAX_STEP) {
      // Final step completed
      progress.isComplete = true;
      progress.completedAt = new Date();
    } else {
      progress.currentStep = step + 1;
    }

    await progress.save();

    res.status(200).json({ progress });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/onboarding/skip
 *
 * Marks onboarding as skipped. Sets skippedAt and isComplete=true.
 */
export async function skipOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const [progress] = await OnboardingProgress.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        currentStep: 1,
        completedSteps: [],
        isComplete: false,
      },
    });

    progress.isComplete = true;
    progress.skippedAt = new Date();

    await progress.save();

    res.status(200).json({ progress });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/onboarding/reset
 *
 * Resets onboarding progress to step 1 (for testing/re-onboarding).
 */
export async function resetOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const [progress] = await OnboardingProgress.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        currentStep: 1,
        completedSteps: [],
        isComplete: false,
      },
    });

    progress.currentStep = 1;
    progress.completedSteps = [];
    progress.isComplete = false;
    progress.skippedAt = null;
    progress.completedAt = null;

    await progress.save();

    res.status(200).json({ progress });
  } catch (err) {
    next(err);
  }
}
