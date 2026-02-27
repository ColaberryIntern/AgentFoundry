import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

const VALID_REPORT_TYPES = [
  'compliance_summary',
  'risk_assessment',
  'audit_trail',
  'regulatory_status',
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

/**
 * Validates the body of POST /api/reports/templates requests.
 */
export const validateCreateTemplate = [
  body('name')
    .notEmpty()
    .withMessage('name is required')
    .isString()
    .withMessage('name must be a string'),
  body('reportType')
    .isIn(VALID_REPORT_TYPES)
    .withMessage(`reportType must be one of: ${VALID_REPORT_TYPES.join(', ')}`),
  body('description').optional().isString().withMessage('description must be a string'),
  body('defaultParameters')
    .optional()
    .isObject()
    .withMessage('defaultParameters must be an object'),
  body('sections').optional().isArray().withMessage('sections must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  handleValidationErrors,
];

/**
 * Validates the body of PUT /api/reports/templates/:id requests.
 * All fields are optional on update.
 */
export const validateUpdateTemplate = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('name cannot be empty')
    .isString()
    .withMessage('name must be a string'),
  body('reportType')
    .optional()
    .isIn(VALID_REPORT_TYPES)
    .withMessage(`reportType must be one of: ${VALID_REPORT_TYPES.join(', ')}`),
  body('description').optional().isString().withMessage('description must be a string'),
  body('defaultParameters')
    .optional()
    .isObject()
    .withMessage('defaultParameters must be an object'),
  body('sections').optional().isArray().withMessage('sections must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  handleValidationErrors,
];
