import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateCreateSchedule, validateUpdateSchedule } from '../middleware/validateSchedule';
import {
  createSchedule,
  listSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/scheduleController';

const router = Router();

// All schedule routes require authentication
router.use(authenticate);

// POST /api/reports/schedules -- create a new scheduled report
router.post('/', validateCreateSchedule, createSchedule);

// GET /api/reports/schedules -- list user's schedules
router.get('/', listSchedules);

// GET /api/reports/schedules/:id -- get a single schedule
router.get('/:id', getSchedule);

// PUT /api/reports/schedules/:id -- update schedule
router.put('/:id', validateUpdateSchedule, updateSchedule);

// DELETE /api/reports/schedules/:id -- delete schedule
router.delete('/:id', deleteSchedule);

export default router;
