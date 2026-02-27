/**
 * Structured application error class for consistent error handling.
 *
 * Provides static factory methods for common HTTP error types and
 * carries a machine-readable `code` alongside the human-readable message.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace in V8 environments
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 400 Bad Request -- validation failures, malformed input
   */
  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  /**
   * 401 Unauthorized -- missing or invalid credentials
   */
  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  /**
   * 403 Forbidden -- authenticated but lacking permissions
   */
  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  /**
   * 404 Not Found -- requested resource does not exist
   */
  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  /**
   * 409 Conflict -- duplicate resource, unique constraint violation
   */
  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, 409, 'CONFLICT', details);
  }
}
