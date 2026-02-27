import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateCreateTemplate, validateUpdateTemplate } from '../middleware/validateTemplate';
import {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/templateController';

const router = Router();

// All template routes require authentication
router.use(authenticate);

// POST /api/reports/templates -- create a new template
router.post('/', validateCreateTemplate, createTemplate);

// GET /api/reports/templates -- list templates (own + public)
router.get('/', listTemplates);

// GET /api/reports/templates/:id -- get a single template
router.get('/:id', getTemplate);

// PUT /api/reports/templates/:id -- update own template
router.put('/:id', validateUpdateTemplate, updateTemplate);

// DELETE /api/reports/templates/:id -- delete own template
router.delete('/:id', deleteTemplate);

export default router;
