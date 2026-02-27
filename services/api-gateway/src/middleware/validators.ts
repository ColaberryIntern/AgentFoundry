import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * Middleware that checks for express-validator errors and returns a
 * standardised 400 response when validation fails.
 *
 * Follows the same pattern used in compliance-monitor-service.
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

// ---------------------------------------------------------------------------
// POST /api/compliance/analyze — body validation
// ---------------------------------------------------------------------------
export const validateComplianceAnalyze = [
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
  body('compliance_type').optional().isString().withMessage('compliance_type must be a string'),
  body('threshold')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('threshold must be a number between 0 and 100'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// POST /api/feedback — body validation
// ---------------------------------------------------------------------------
const VALID_FEEDBACK_CATEGORIES = ['bug', 'feature_request', 'usability', 'performance', 'other'];

export const validateFeedbackSubmission = [
  body('category')
    .isString()
    .withMessage('category must be a string')
    .isIn(VALID_FEEDBACK_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_FEEDBACK_CATEGORIES.join(', ')}`),
  body('message')
    .isString()
    .withMessage('message must be a string')
    .trim()
    .notEmpty()
    .withMessage('message is required')
    .isLength({ max: 2000 })
    .withMessage('message must not exceed 2000 characters'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('rating must be an integer between 1 and 5'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// POST /api/analytics/event — body validation
// ---------------------------------------------------------------------------
export const validateAnalyticsEvent = [
  body('eventType')
    .isString()
    .withMessage('eventType must be a string')
    .trim()
    .notEmpty()
    .withMessage('eventType is required'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// POST /api/analytics/events (batch) — body validation
// ---------------------------------------------------------------------------
export const validateAnalyticsBatch = [
  body('events').isArray({ min: 1 }).withMessage('events must be a non-empty array'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// POST /api/search/natural — body validation
// ---------------------------------------------------------------------------
export const validateNaturalLanguageSearch = [
  body('query')
    .isString()
    .withMessage('query must be a string')
    .trim()
    .notEmpty()
    .withMessage('query is required')
    .isLength({ max: 500 })
    .withMessage('query must not exceed 500 characters'),
  handleValidationErrors,
];

// ---------------------------------------------------------------------------
// POST /api/interactions — body validation
// ---------------------------------------------------------------------------
export const validateInteraction = [
  body('userId')
    .isString()
    .withMessage('userId must be a string')
    .trim()
    .notEmpty()
    .withMessage('userId is required'),
  body('itemId')
    .isString()
    .withMessage('itemId must be a string')
    .trim()
    .notEmpty()
    .withMessage('itemId is required'),
  body('interactionType')
    .isString()
    .withMessage('interactionType must be a string')
    .trim()
    .notEmpty()
    .withMessage('interactionType is required'),
  handleValidationErrors,
];
