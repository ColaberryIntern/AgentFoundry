import { Request, Response, NextFunction } from 'express';

/**
 * Strips HTML tags from a string to prevent XSS attacks.
 * Also collapses multiple whitespace characters and trims the result.
 */
function stripHtmlTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim();
}

/**
 * Recursively sanitizes all string values in an object or array.
 *
 * - Strings: HTML tags are stripped, whitespace is trimmed
 * - Arrays: each element is sanitized
 * - Objects: each value is sanitized (keys are preserved)
 * - Primitives (number, boolean, null): returned as-is
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return stripHtmlTags(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }

  return value;
}

/**
 * Input sanitization middleware.
 *
 * Recursively sanitizes `req.body`, `req.query`, and `req.params` to
 * strip HTML tags and trim whitespace from all string values. This
 * provides a defence-in-depth layer against stored XSS attacks.
 *
 * Should be mounted early in the middleware chain, after `express.json()`.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.query = sanitizeValue(req.query) as any;
  }

  if (req.params && typeof req.params === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.params = sanitizeValue(req.params) as any;
  }

  next();
}

export { stripHtmlTags, sanitizeValue };
