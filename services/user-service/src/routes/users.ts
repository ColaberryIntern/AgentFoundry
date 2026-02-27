import { Router } from 'express';
import { validateRegistration, validateLogin } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  register,
  login,
  verifyEmail,
  refreshTokenHandler,
  getProfile,
  eraseUserData,
} from '../controllers/userController';

const router = Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.get('/verify/:token', verifyEmail);
router.post('/refresh-token', refreshTokenHandler);

// Protected routes
router.get('/profile', authenticate, getProfile);

// GDPR Data Erasure — requires auth + (own user or it_admin)
router.delete('/:id/data', authenticate, eraseUserData);

export default router;
