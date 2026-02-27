import { Request, Response, NextFunction } from 'express';

/**
 * Standardised error response shape returned by the API Gateway.
 */
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Map of HTTP status codes to default error messages.
 */
const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

/**
 * Centralized error-handling middleware.
 *
 * Must be mounted **after** all routes so Express forwards unhandled errors
 * here.  Returns a deterministic JSON envelope regardless of the error origin.
 */
export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? `ERR_${statusCode}`;
  const message =
    err.message && err.message !== 'Error'
      ? err.message
      : (DEFAULT_MESSAGES[statusCode] ?? 'Internal Server Error');

  // Log the full error in non-test environments for observability.
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[api-gateway] ${statusCode} ${code}: ${message}`, err.stack);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details ?? null,
    },
  });
}
