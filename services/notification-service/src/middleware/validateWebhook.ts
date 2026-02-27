import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { VALID_WEBHOOK_EVENTS } from '../models/Webhook';

/**
 * Validates the body of POST /api/webhooks requests.
 *
 * Required fields:
 *   - url:    valid URL, not empty
 *   - events: non-empty array of valid event type strings
 *
 * Optional fields:
 *   - description: trimmed string
 */
export const validateCreateWebhook = [
  body('url')
    .isURL()
    .withMessage('url must be a valid URL')
    .notEmpty()
    .withMessage('url is required'),
  body('events').isArray({ min: 1 }).withMessage('events must be a non-empty array'),
  body('events.*')
    .isIn([...VALID_WEBHOOK_EVENTS])
    .withMessage(`Each event must be one of: ${VALID_WEBHOOK_EVENTS.join(', ')}`),
  body('description').optional().isString().withMessage('description must be a string').trim(),
  handleValidationErrors,
];

/**
 * Validates the body of PUT /api/webhooks/:id requests.
 *
 * All fields are optional:
 *   - url:      valid URL
 *   - events:   non-empty array of valid event type strings
 *   - isActive: boolean
 */
export const validateUpdateWebhook = [
  body('url').optional().isURL().withMessage('url must be a valid URL'),
  body('events').optional().isArray({ min: 1 }).withMessage('events must be a non-empty array'),
  body('events.*')
    .optional()
    .isIn([...VALID_WEBHOOK_EVENTS])
    .withMessage(`Each event must be one of: ${VALID_WEBHOOK_EVENTS.join(', ')}`),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors,
];

/**
 * Middleware that checks for express-validator errors and returns a
 * standardised 400 response when validation fails.
 */
function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
    return;
  }
  next();
}
