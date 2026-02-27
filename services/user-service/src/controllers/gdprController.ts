import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { UserPreference } from '../models/UserPreference';
import { OnboardingProgress } from '../models/OnboardingProgress';
import { AuditLog } from '../models/AuditLog';
import { ApiKey } from '../models/ApiKey';
import { ConsentRecord } from '../models/ConsentRecord';
import { AppError } from '../utils/AppError';

/**
 * DELETE /api/users/:id/data
 *
 * GDPR Right to Erasure.
 *
 * Anonymizes the user's personal data and deletes associated records
 * (preferences, onboarding progress, API keys, audit logs, consent records).
 *
 * Only the user themselves or an it_admin may invoke this endpoint.
 */
export async function eraseUserData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetId = parseInt(req.params.id as string, 10);
    const requestingUserId = req.user?.userId;
    const requestingRole = req.user?.role;

    // Only the user themselves or an it_admin can erase data
    if (requestingUserId !== targetId && requestingRole !== 'it_admin') {
      throw AppError.forbidden("You do not have permission to erase this user's data");
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Delete associated records
    await UserPreference.destroy({ where: { userId: targetId } });
    await OnboardingProgress.destroy({ where: { userId: targetId } });
    await ApiKey.destroy({ where: { userId: targetId } });
    await AuditLog.destroy({ where: { userId: targetId } });
    await ConsentRecord.destroy({ where: { userId: targetId } });

    // Anonymize user data
    user.email = `deleted_${targetId}@removed.local`;
    user.passwordHash = '';
    user.isVerified = false;
    user.role = 'compliance_officer';
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: 'User data erased successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id/data-export
 *
 * GDPR Right to Access (Data Portability).
 *
 * Exports all data associated with the user as a JSON object.
 *
 * Only the user themselves or an it_admin may invoke this endpoint.
 */
export async function exportUserData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetId = parseInt(req.params.id as string, 10);
    const requestingUserId = req.user?.userId;
    const requestingRole = req.user?.role;

    // Only the user themselves or an it_admin can export data
    if (requestingUserId !== targetId && requestingRole !== 'it_admin') {
      throw AppError.forbidden("You do not have permission to export this user's data");
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Gather all associated data
    const preferences = await UserPreference.findOne({ where: { userId: targetId } });
    const onboarding = await OnboardingProgress.findOne({ where: { userId: targetId } });
    const apiKeys = await ApiKey.findAll({ where: { userId: targetId } });
    const auditLogs = await AuditLog.findAll({ where: { userId: targetId } });
    const consentRecords = await ConsentRecord.findAll({ where: { userId: targetId } });

    const exportData = {
      user: user.toSafeJSON(),
      preferences: preferences ? preferences.toJSON() : null,
      onboarding: onboarding ? onboarding.toJSON() : null,
      apiKeys: apiKeys.map((k) => ({
        id: k.id,
        name: (k as unknown as Record<string, unknown>).name,
        createdAt: k.createdAt,
      })),
      auditLogs: auditLogs.map((l) => l.toJSON()),
      consentRecords: consentRecords.map((c) => c.toJSON()),
      exportedAt: new Date().toISOString(),
    };

    res.status(200).json(exportData);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:id/consent
 *
 * Records user consent with timestamp and scope.
 *
 * Required body fields:
 *   - scope: string describing what is being consented to (e.g. 'marketing', 'analytics')
 *   - granted: boolean indicating consent granted or withdrawn
 *
 * Only the user themselves or an it_admin may invoke this endpoint.
 */
export async function recordConsent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetId = parseInt(req.params.id as string, 10);
    const requestingUserId = req.user?.userId;
    const requestingRole = req.user?.role;

    // Only the user themselves or an it_admin can record consent
    if (requestingUserId !== targetId && requestingRole !== 'it_admin') {
      throw AppError.forbidden('You do not have permission to manage consent for this user');
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const { scope, granted } = req.body;

    if (!scope || typeof scope !== 'string' || scope.trim().length === 0) {
      throw AppError.badRequest('scope is required and must be a non-empty string');
    }

    if (typeof granted !== 'boolean') {
      throw AppError.badRequest('granted is required and must be a boolean');
    }

    const consentRecord = await ConsentRecord.create({
      userId: targetId,
      scope: scope.trim(),
      granted,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(201).json({
      message: 'Consent recorded successfully',
      consent: consentRecord.toJSON(),
    });
  } catch (err) {
    next(err);
  }
}
