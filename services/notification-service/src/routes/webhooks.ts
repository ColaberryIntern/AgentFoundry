import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateCreateWebhook, validateUpdateWebhook } from '../middleware/validateWebhook';
import {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
  testWebhook,
} from '../controllers/webhookController';

const router = Router();

// All webhook endpoints require authentication
router.post('/', authenticate, validateCreateWebhook, createWebhook);
router.get('/', authenticate, listWebhooks);
router.get('/:id', authenticate, getWebhook);
router.put('/:id', authenticate, validateUpdateWebhook, updateWebhook);
router.delete('/:id', authenticate, deleteWebhook);
router.get('/:id/logs', authenticate, getWebhookLogs);
router.post('/:id/test', authenticate, testWebhook);

export default router;
