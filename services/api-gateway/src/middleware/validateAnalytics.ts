import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Validates the body of POST /api/analytics/event.
 *
 * Requires:
 * - eventType: non-empty string (trimmed)
 */
export function validateTrackEvent(req: Request, _res: Response, next: NextFunction): void {
  const { eventType } = req.body;

  if (!eventType || typeof eventType !== 'string' || eventType.trim().length === 0) {
    return next(AppError.badRequest('eventType is required and must be a non-empty string'));
  }

  // Normalize
  req.body.eventType = eventType.trim();
  next();
}

/**
 * Validates the body of POST /api/analytics/events (batch).
 *
 * Requires:
 * - events: non-empty array
 */
export function validateTrackBatch(req: Request, _res: Response, next: NextFunction): void {
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return next(AppError.badRequest('events must be a non-empty array'));
  }

  next();
}
