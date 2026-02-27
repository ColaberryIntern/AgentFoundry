import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt';

/**
 * POST /register
 *
 * Creates a new user account. Validates password strength, checks for
 * duplicate email, hashes the password, generates a verification token,
 * and returns the user with access + refresh tokens.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, role } = req.body;

    // Validate password strength
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw AppError.badRequest('Password does not meet strength requirements', strength.errors);
    }

    // Check for duplicate email
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw AppError.conflict('Email already registered');
    }

    // Hash password and generate verification token
    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      role: role ?? 'compliance_officer',
      isVerified: false,
      verificationToken,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /login
 *
 * Authenticates a user by email and password. Returns user data with
 * access + refresh tokens on success.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Compare password
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /verify/:token
 *
 * Verifies a user's email address using the verification token
 * generated at registration time.
 */
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.params;

    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) {
      throw AppError.badRequest('Invalid or expired verification token');
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /refresh-token
 *
 * Accepts a valid refresh token and returns a new pair of
 * access + refresh tokens.
 */
export async function refreshTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw AppError.unauthorized('Refresh token is required');
    }

    // Verify the refresh token
    let decoded: { userId: number };
    try {
      decoded = verifyToken(refreshToken) as { userId: number };
    } catch {
      throw AppError.unauthorized('Invalid refresh token');
    }

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.email, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /profile
 *
 * Returns the authenticated user's profile. Requires the authenticate
 * middleware to have set req.user.
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    const user = await User.findByPk(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    res.status(200).json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /:id/data
 *
 * GDPR Data Erasure endpoint.
 *
 * Erases the user's personal data by:
 *   - Replacing email with `deleted_{userId}@removed.local`
 *   - Clearing the passwordHash
 *   - Setting isVerified to false
 *   - Resetting role to the default ('compliance_officer')
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

    // Erase personal data
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
