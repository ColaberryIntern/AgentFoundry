import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateCreateNotification } from '../middleware/validate';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
} from '../controllers/notificationController';

const router = Router();

// Authenticated endpoints
router.get('/', authenticate, listNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/read-all', authenticate, markAllAsRead);
router.put('/:id/read', authenticate, markAsRead);

// Internal service-to-service endpoint (no auth — protected at network/API gateway level)
router.post('/', validateCreateNotification, createNotification);

export default router;
