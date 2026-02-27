import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * Validates the body of POST /api/compliance/monitor requests.
 *
 * Required fields:
 *   - regulationId: non-empty string, trimmed, HTML-escaped
 *   - dataSource:   non-empty string, trimmed
 *   - complianceType: non-empty string
 *
 * Optional fields:
 *   - threshold: float between 0 and 100
 */
export const validateCreateMonitor = [
  body('regulation_id')
    .isString()
    .withMessage('regulation_id must be a string')
    .trim()
    .notEmpty()
    .withMessage('regulation_id is required')
    .escape(),
  body('data_source')
    .isString()
    .withMessage('data_source must be a string')
    .trim()
    .notEmpty()
    .withMessage('data_source is required'),
  body('compliance_type')
    .isString()
    .withMessage('compliance_type must be a string')
    .notEmpty()
    .withMessage('compliance_type is required'),
  body('threshold')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('threshold must be a number between 0 and 100'),
  handleValidationErrors,
];

/**
 * Validates the body of PUT /api/compliance/:id/status requests.
 *
 * Required fields:
 *   - status: one of 'compliant', 'non_compliant', 'pending', 'review'
 */
export const validateUpdateStatus = [
  body('status')
    .isIn(['compliant', 'non_compliant', 'pending', 'review'])
    .withMessage('status must be one of: compliant, non_compliant, pending, review'),
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
