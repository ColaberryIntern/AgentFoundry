import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiKey } from '../models/ApiKey';
import { AppError } from '../utils/AppError';
import { hashPassword } from '../utils/password';

/**
 * POST /api/keys
 *
 * Generates a new API key. Only IT Admin can generate keys
 * (enforced by authorize middleware).
 *
 * The full plaintext key is returned ONLY in this response; it is never
 * stored or returned again.
 */
export async function generateKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, expiresAt } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw AppError.badRequest('API key name is required');
    }

    const userId = req.user!.userId;

    // Generate the raw API key: 'af_' prefix + 32 random bytes as hex (67 chars total)
    const rawKey = 'af_' + crypto.randomBytes(32).toString('hex');
    const prefix = rawKey.substring(0, 8);

    // Hash the key for secure storage (reusing bcrypt from password utils)
    const keyHash = await hashPassword(rawKey);

    // Create the record
    const apiKey = await ApiKey.create({
      userId,
      keyHash,
      name: name.trim(),
      prefix,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    // Return the full key (only time it is shown to the user)
    res.status(201).json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        key: rawKey,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/keys
 *
 * Lists the current user's API keys. IT Admin can pass ?all=true
 * to see every key in the system.
 *
 * The key hash is NEVER returned.
 */
export async function listKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const showAll = req.query.all === 'true' && role === 'it_admin';

    const where = showAll ? {} : { userId };

    const keys = await ApiKey.findAll({
      where,
      attributes: ['id', 'name', 'prefix', 'isActive', 'lastUsedAt', 'expiresAt', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      apiKeys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/keys/:id
 *
 * Revokes an API key by setting isActive = false.
 * The caller must be the key owner or an IT Admin.
 */
export async function revokeKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawKeyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const keyId = parseInt(rawKeyId, 10);

    if (isNaN(keyId)) {
      throw AppError.badRequest('Invalid key ID');
    }

    const apiKey = await ApiKey.findByPk(keyId);
    if (!apiKey) {
      throw AppError.notFound('API key not found');
    }

    const userId = req.user!.userId;
    const role = req.user!.role;

    // Must be key owner or IT Admin
    if (apiKey.userId !== userId && role !== 'it_admin') {
      throw AppError.forbidden('You do not have permission to revoke this key');
    }

    apiKey.isActive = false;
    await apiKey.save();

    res.status(200).json({ message: 'API key revoked successfully' });
  } catch (err) {
    next(err);
  }
}
