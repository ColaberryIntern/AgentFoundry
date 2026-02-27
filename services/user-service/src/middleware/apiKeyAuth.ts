import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError';
import { ApiKey } from '../models/ApiKey';
import { User } from '../models/User';

/**
 * API Key authentication middleware.
 *
 * Checks for the `X-API-Key` header and authenticates the request
 * by matching the key against stored API key records.
 *
 * On success, sets req.user with the associated user's details
 * and updates the key's lastUsedAt timestamp.
 *
 * Throws AppError.unauthorized('Invalid API key') if the key is
 * missing, invalid, inactive, or expired.
 */
export async function authenticateApiKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

    if (!apiKeyHeader) {
      throw AppError.unauthorized('Invalid API key');
    }

    // Extract the prefix (first 8 characters) for efficient lookup
    const prefix = apiKeyHeader.substring(0, 8);

    // Find candidate keys by prefix match
    const candidates = await ApiKey.findAll({
      where: { prefix },
    });

    if (candidates.length === 0) {
      throw AppError.unauthorized('Invalid API key');
    }

    // Verify the full key against each candidate's hash
    let matchedKey: InstanceType<typeof ApiKey> | null = null;

    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(apiKeyHeader, candidate.keyHash);
      if (isMatch) {
        matchedKey = candidate;
        break;
      }
    }

    if (!matchedKey) {
      throw AppError.unauthorized('Invalid API key');
    }

    // Check if key is active
    if (!matchedKey.isActive) {
      throw AppError.unauthorized('Invalid API key');
    }

    // Check if key is expired
    if (matchedKey.expiresAt && new Date(matchedKey.expiresAt) < new Date()) {
      throw AppError.unauthorized('Invalid API key');
    }

    // Look up the associated user
    const user = await User.findByPk(matchedKey.userId);

    if (!user) {
      throw AppError.unauthorized('Invalid API key');
    }

    // Set req.user with the user's details
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Update lastUsedAt (fire-and-forget, don't block the response)
    matchedKey.update({ lastUsedAt: new Date() }).catch((err) => {
      console.error('[api-key-auth] Failed to update lastUsedAt:', err);
    });

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      next(AppError.unauthorized('Invalid API key'));
    }
  }
}
