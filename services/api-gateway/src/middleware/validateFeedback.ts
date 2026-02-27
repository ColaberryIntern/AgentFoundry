import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

const VALID_CATEGORIES = ['bug', 'feature_request', 'usability', 'performance', 'other'];

/**
 * Validates the body of POST /api/feedback.
 *
 * Requires:
 * - category: one of bug, feature_request, usability, performance, other
 * - message: non-empty string, max 2000 chars (trimmed)
 * - rating: optional, integer 1-5
 */
export function validateSubmitFeedback(req: Request, _res: Response, next: NextFunction): void {
  const { category, message, rating } = req.body;

  // Validate category
  if (!category || typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
    return next(
      AppError.badRequest(
        `category is required and must be one of: ${VALID_CATEGORIES.join(', ')}`,
      ),
    );
  }

  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return next(AppError.badRequest('message is required and must be a non-empty string'));
  }

  if (message.trim().length > 2000) {
    return next(AppError.badRequest('message must not exceed 2000 characters'));
  }

  // Normalize message
  req.body.message = message.trim();

  // Validate rating (optional)
  if (rating !== undefined && rating !== null) {
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return next(AppError.badRequest('rating must be an integer between 1 and 5'));
    }
    req.body.rating = ratingNum;
  }

  next();
}
