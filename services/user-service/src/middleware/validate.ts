import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { validatePasswordStrength } from '../utils/password';

const VALID_ROLES = ['c_suite', 'compliance_officer', 'it_admin'] as const;

/**
 * Simple email format check (RFC 5322 simplified).
 */
function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Validates registration request body:
 * - email: required, must be valid email format
 * - password: required, must pass password strength rules
 * - role: optional (defaults to 'compliance_officer'), must be a valid enum value
 */
export function validateRegistration(req: Request, _res: Response, next: NextFunction): void {
  const errors: string[] = [];
  const { email, password, role } = req.body ?? {};

  // Email validation
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Email must be a valid email address');
  }

  // Password validation
  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  } else {
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      errors.push(...strength.errors);
    }
  }

  // Role validation (optional -- defaults to compliance_officer)
  if (role !== undefined && role !== null) {
    if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return next(AppError.badRequest('Validation failed', errors));
  }

  next();
}

/**
 * Validates login request body:
 * - email: required, non-empty string
 * - password: required, non-empty string
 */
export function validateLogin(req: Request, _res: Response, next: NextFunction): void {
  const errors: string[] = [];
  const { email, password } = req.body ?? {};

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return next(AppError.badRequest('Validation failed', errors));
  }

  next();
}

/**
 * Validates advance-step request body:
 * - step: required, must be an integer between 1 and 6
 */
export function validateAdvanceStep(req: Request, _res: Response, next: NextFunction): void {
  const errors: string[] = [];
  const { step } = req.body ?? {};

  if (step === undefined || step === null) {
    errors.push('Step is required');
  } else if (typeof step !== 'number' || !Number.isInteger(step)) {
    errors.push('Step must be an integer');
  } else if (step < 1 || step > 6) {
    errors.push('Step must be between 1 and 6');
  }

  if (errors.length > 0) {
    return next(AppError.badRequest('Validation failed', errors));
  }

  next();
}

const VALID_THEMES = ['light', 'dark', 'system'] as const;

/**
 * Validates update-preferences request body:
 * - theme: optional, must be one of 'light', 'dark', 'system'
 * - layoutPreferences: optional, must be a non-null object (not an array)
 */
export function validateUpdatePreferences(req: Request, _res: Response, next: NextFunction): void {
  const errors: string[] = [];
  const { theme, layoutPreferences } = req.body ?? {};

  // Theme validation (optional)
  if (theme !== undefined && theme !== null) {
    if (
      typeof theme !== 'string' ||
      !VALID_THEMES.includes(theme as (typeof VALID_THEMES)[number])
    ) {
      errors.push(`Theme must be one of: ${VALID_THEMES.join(', ')}`);
    }
  }

  // layoutPreferences validation (optional)
  if (layoutPreferences !== undefined && layoutPreferences !== null) {
    if (typeof layoutPreferences !== 'object' || Array.isArray(layoutPreferences)) {
      errors.push('layoutPreferences must be a JSON object');
    }
  }

  if (errors.length > 0) {
    return next(AppError.badRequest('Validation failed', errors));
  }

  next();
}
