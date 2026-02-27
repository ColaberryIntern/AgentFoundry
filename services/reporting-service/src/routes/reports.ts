import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateCreateReport } from '../middleware/validate';
import {
  createReport,
  getReport,
  listReports,
  downloadReport,
} from '../controllers/reportController';

const router = Router();

// All report routes require authentication
router.use(authenticate);

// POST /api/reports -- create a new report
router.post('/', validateCreateReport, createReport);

// GET /api/reports -- list reports (with optional ?status, ?page, ?limit)
router.get('/', listReports);

// GET /api/reports/download/:filename -- download a generated report file
// NOTE: this must be defined before /:id to avoid matching 'download' as an id
router.get('/download/:filename', downloadReport);

// GET /api/reports/:id -- get a single report
router.get('/:id', getReport);

export default router;
