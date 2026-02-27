import { Request, Response, NextFunction } from 'express';
import { UserPreference } from '../models/UserPreference';
import { AppError } from '../utils/AppError';

/**
 * GET /api/users/preferences
 *
 * Returns the authenticated user's preferences. If no preference
 * record exists yet, creates one with default values and returns it.
 */
export async function getPreferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    // Find or create default preferences for this user
    const [preferences] = await UserPreference.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        theme: 'system',
        layoutPreferences: {},
      },
    });

    res.status(200).json({ preferences });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/preferences
 *
 * Updates the authenticated user's preferences. Accepts partial
 * updates — only the provided fields (theme, layoutPreferences)
 * are modified. Creates a default record first if none exists.
 */
export async function updatePreferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { theme, layoutPreferences } = req.body;

    // Find or create default preferences for this user
    const [preferences] = await UserPreference.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        theme: 'system',
        layoutPreferences: {},
      },
    });

    // Apply partial updates
    if (theme !== undefined) {
      preferences.theme = theme;
    }
    if (layoutPreferences !== undefined) {
      preferences.layoutPreferences = layoutPreferences;
    }

    await preferences.save();

    res.status(200).json({ preferences });
  } catch (err) {
    next(err);
  }
}
