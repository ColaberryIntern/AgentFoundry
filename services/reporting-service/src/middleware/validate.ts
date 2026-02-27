import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * Validates the body of POST /api/reports requests.
 *
 * Required fields:
 *   - reportType: one of 'compliance_summary', 'risk_assessment', 'audit_trail', 'regulatory_status'
 *
 * Optional fields:
 *   - format: one of 'pdf', 'csv'
 */
export const validateCreateReport = [
  body('reportType')
    .isIn(['compliance_summary', 'risk_assessment', 'audit_trail', 'regulatory_status'])
    .withMessage(
      'reportType must be one of: compliance_summary, risk_assessment, audit_trail, regulatory_status',
    ),
  body('format').optional().isIn(['pdf', 'csv']).withMessage('format must be one of: pdf, csv'),
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
