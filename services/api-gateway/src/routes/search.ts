import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { search, suggestions, getSearchHistory } from '../controllers/searchController';

const router = Router();

/**
 * GET /api/search
 * Unified search across compliance records and reports.
 * Requires authentication.
 */
router.get('/', authenticate, search);

/**
 * GET /api/search/suggestions
 * Returns autocomplete suggestions based on recent search history.
 * Requires authentication.
 */
router.get('/suggestions', authenticate, suggestions);

/**
 * GET /api/search/history
 * Returns the authenticated user's recent search history.
 * Requires authentication.
 */
router.get('/history', authenticate, getSearchHistory);

export default router;
