import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * Validates the body of POST /api/notifications requests.
 *
 * Required fields:
 *   - userId:  valid UUID
 *   - type:    one of 'compliance_alert', 'report_ready', 'system', 'role_change'
 *   - title:   non-empty string, trimmed, HTML-escaped
 *   - message: non-empty string, trimmed
 */
export const validateCreateNotification = [
  body('userId').isUUID().withMessage('userId must be a valid UUID'),
  body('type')
    .isIn(['compliance_alert', 'report_ready', 'system', 'role_change'])
    .withMessage('type must be one of: compliance_alert, report_ready, system, role_change'),
  body('title')
    .isString()
    .withMessage('title must be a string')
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .escape(),
  body('message')
    .isString()
    .withMessage('message must be a string')
    .trim()
    .notEmpty()
    .withMessage('message is required'),
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
