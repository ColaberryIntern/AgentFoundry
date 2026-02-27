import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

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

// ── Recommendation Feedback Validation ──────────────────────────────

export const validateFeedback = [
  body('recommendationId')
    .notEmpty()
    .withMessage('recommendationId is required')
    .isUUID()
    .withMessage('recommendationId must be a valid UUID'),
  body('action')
    .notEmpty()
    .withMessage('action is required')
    .isIn(['accept', 'dismiss'])
    .withMessage('action must be one of: accept, dismiss'),
  handleValidationErrors,
];

// ── Model Registration Validation ───────────────────────────────────

const VALID_MODEL_TYPES = [
  'random_forest',
  'lstm',
  'isolation_forest',
  'genetic_algorithm',
  'arima',
  'hierarchical_clustering',
  'collaborative_filtering',
  'bert',
];

export const validateRegisterModel = [
  body('name').notEmpty().withMessage('name is required'),
  body('version').notEmpty().withMessage('version is required'),
  body('type')
    .notEmpty()
    .withMessage('type is required')
    .isIn(VALID_MODEL_TYPES)
    .withMessage(`type must be one of: ${VALID_MODEL_TYPES.join(', ')}`),
  handleValidationErrors,
];

// ── Model Status Update Validation ──────────────────────────────────

const VALID_STATUSES = ['training', 'ready', 'deployed', 'deprecated'];

export const validateUpdateStatus = [
  body('status')
    .notEmpty()
    .withMessage('status is required')
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  handleValidationErrors,
];

// ── Inference Validation ────────────────────────────────────────────

export const validateComplianceGaps = [
  body('userId')
    .notEmpty()
    .withMessage('userId is required')
    .isUUID()
    .withMessage('userId must be a valid UUID'),
  body('complianceData')
    .isArray({ min: 1 })
    .withMessage('complianceData must be a non-empty array'),
  handleValidationErrors,
];

export const validateRegulatoryPredictions = [
  body('userId')
    .notEmpty()
    .withMessage('userId is required')
    .isUUID()
    .withMessage('userId must be a valid UUID'),
  body('regulationIds').isArray({ min: 1 }).withMessage('regulationIds must be a non-empty array'),
  handleValidationErrors,
];

// ── Drift Analysis Validation ─────────────────────────────────────

export const validateDriftAnalysis = [
  body('agentId').notEmpty().withMessage('agentId is required'),
  body('metrics').isObject().withMessage('metrics must be an object'),
  handleValidationErrors,
];

// ── Deployment Optimisation Validation ─────────────────────────────

export const validateOptimizeDeployment = [
  body('constraints').isObject().withMessage('constraints must be an object'),
  handleValidationErrors,
];

// ── Market Signals Validation ──────────────────────────────────────

export const validateMarketSignals = [
  body('industry').notEmpty().withMessage('industry is required'),
  body('history').isArray().withMessage('history must be an array'),
  handleValidationErrors,
];

// ── Classify Regulations Validation ────────────────────────────────

export const validateClassifyRegulations = [
  body('regulations').isArray({ min: 1 }).withMessage('regulations must be a non-empty array'),
  handleValidationErrors,
];
