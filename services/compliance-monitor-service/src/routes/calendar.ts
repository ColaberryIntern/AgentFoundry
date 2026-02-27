import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listCalendarEvents,
  getUpcomingDeadlines,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../controllers/calendarController';

const router = Router();

// GET /api/compliance/calendar/upcoming — upcoming deadlines and audits (must be before :id)
router.get('/upcoming', authenticate, getUpcomingDeadlines);

// GET /api/compliance/calendar — list events with filters
router.get('/', authenticate, listCalendarEvents);

// GET /api/compliance/calendar/:id — single event
router.get('/:id', authenticate, getCalendarEvent);

// POST /api/compliance/calendar — create event
router.post('/', authenticate, createCalendarEvent);

// PUT /api/compliance/calendar/:id — update event
router.put('/:id', authenticate, updateCalendarEvent);

// DELETE /api/compliance/calendar/:id — delete event
router.delete('/:id', authenticate, deleteCalendarEvent);

export default router;
