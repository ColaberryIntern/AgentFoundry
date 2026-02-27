import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Maps HTTP status codes to machine-readable error codes.
 * Used as a fallback when the error does not carry its own code.
 */
const STATUS_CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR',
};

/**
 * Centralized error-handling middleware.
 *
 * Returns a standardized JSON envelope:
 * {
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Human-readable message",
 *     "details": { ... }      // optional
 *   }
 * }
 *
 * Must be registered after all routes so Express recognises the
 * four-parameter signature as an error handler.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Determine if this is a structured AppError
  const isAppError = err instanceof AppError;

  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : STATUS_CODE_MAP[statusCode] || 'INTERNAL_ERROR';
  const message = isAppError && err.isOperational ? err.message : 'Internal server error';
  const details = isAppError ? err.details : undefined;

  // Log non-operational (unexpected) errors at error level
  if (!isAppError || !err.isOperational) {
    console.error('[reporting-service] Unexpected error:', err);
  }

  const responseBody: { error: { code: string; message: string; details?: unknown } } = {
    error: { code, message },
  };

  if (details !== undefined) {
    responseBody.error.details = details;
  }

  res.status(statusCode).json(responseBody);
}
