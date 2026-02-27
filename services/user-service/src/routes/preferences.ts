import { Router } from 'express';
import { validateUpdatePreferences } from '../middleware/validate';
import { getPreferences, updatePreferences } from '../controllers/preferencesController';

const router = Router();

// GET  / — returns the authenticated user's preferences
router.get('/', getPreferences);

// PUT  / — updates theme and/or layoutPreferences
router.put('/', validateUpdatePreferences, updatePreferences);

export default router;
