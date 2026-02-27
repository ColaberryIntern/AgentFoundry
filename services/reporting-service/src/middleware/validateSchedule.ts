import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { isValidCron } from '../utils/cronValidator';

const VALID_REPORT_TYPES = [
  'compliance_summary',
  'risk_assessment',
  'audit_trail',
  'regulatory_status',
];
const VALID_FORMATS = ['pdf', 'csv'];

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
 * Validates the body of POST /api/reports/schedules requests.
 */
export const validateCreateSchedule = [
  body('reportType')
    .isIn(VALID_REPORT_TYPES)
    .withMessage(`reportType must be one of: ${VALID_REPORT_TYPES.join(', ')}`),
  body('schedule')
    .notEmpty()
    .withMessage('schedule is required')
    .isString()
    .withMessage('schedule must be a string')
    .custom((value: string) => {
      if (!isValidCron(value)) {
        throw new Error('Invalid cron expression. Must be a valid 5-field cron format.');
      }
      return true;
    }),
  body('format')
    .optional()
    .isIn(VALID_FORMATS)
    .withMessage(`format must be one of: ${VALID_FORMATS.join(', ')}`),
  body('templateId').optional().isUUID().withMessage('templateId must be a valid UUID'),
  body('parameters').optional().isObject().withMessage('parameters must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors,
];

/**
 * Validates the body of PUT /api/reports/schedules/:id requests.
 * All fields are optional on update.
 */
export const validateUpdateSchedule = [
  body('reportType')
    .optional()
    .isIn(VALID_REPORT_TYPES)
    .withMessage(`reportType must be one of: ${VALID_REPORT_TYPES.join(', ')}`),
  body('schedule')
    .optional()
    .isString()
    .withMessage('schedule must be a string')
    .custom((value: string) => {
      if (value && !isValidCron(value)) {
        throw new Error('Invalid cron expression. Must be a valid 5-field cron format.');
      }
      return true;
    }),
  body('format')
    .optional()
    .isIn(VALID_FORMATS)
    .withMessage(`format must be one of: ${VALID_FORMATS.join(', ')}`),
  body('templateId').optional().isUUID().withMessage('templateId must be a valid UUID'),
  body('parameters').optional().isObject().withMessage('parameters must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors,
];
