import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { SearchHistory } from '../models/SearchHistory';
import { AppError } from '../utils/AppError';
import { cache } from '../utils/cache';

/**
 * Shape of a unified search result returned by the API.
 */
interface SearchResult {
  id: string;
  type: 'compliance' | 'report';
  title: string;
  description: string;
  status: string;
  createdAt: string;
  matchScore: number;
}

/**
 * Mock compliance records for MVP search.
 * In production these would come from the compliance-monitor-service via HTTP.
 */
const MOCK_COMPLIANCE: SearchResult[] = [
  {
    id: 'c-001',
    type: 'compliance',
    title: 'GDPR Data Retention Compliance',
    description: 'Annual GDPR data retention policy compliance check',
    status: 'compliant',
    createdAt: '2024-06-15T10:00:00.000Z',
    matchScore: 0.95,
  },
  {
    id: 'c-002',
    type: 'compliance',
    title: 'SOX Audit Trail Compliance',
    description: 'SOX compliance audit trail verification for Q2',
    status: 'non_compliant',
    createdAt: '2024-03-20T08:30:00.000Z',
    matchScore: 0.88,
  },
  {
    id: 'c-003',
    type: 'compliance',
    title: 'HIPAA Security Rule Review',
    description: 'HIPAA security rule compliance assessment for healthcare data',
    status: 'pending',
    createdAt: '2024-09-01T14:00:00.000Z',
    matchScore: 0.82,
  },
  {
    id: 'c-004',
    type: 'compliance',
    title: 'PCI DSS Compliance Check',
    description: 'Payment card industry data security standard compliance review',
    status: 'compliant',
    createdAt: '2024-07-10T09:15:00.000Z',
    matchScore: 0.79,
  },
  {
    id: 'c-005',
    type: 'compliance',
    title: 'ISO 27001 Certification Review',
    description: 'Information security management system certification compliance',
    status: 'review',
    createdAt: '2024-08-22T11:45:00.000Z',
    matchScore: 0.75,
  },
];

/**
 * Mock report records for MVP search.
 * In production these would come from the reporting-service via HTTP.
 */
const MOCK_REPORTS: SearchResult[] = [
  {
    id: 'r-001',
    type: 'report',
    title: 'Q2 Compliance Summary Report',
    description: 'Quarterly compliance summary covering all regulatory frameworks',
    status: 'completed',
    createdAt: '2024-07-01T12:00:00.000Z',
    matchScore: 0.92,
  },
  {
    id: 'r-002',
    type: 'report',
    title: 'Risk Assessment Report - Infrastructure',
    description: 'Comprehensive risk assessment for cloud infrastructure components',
    status: 'completed',
    createdAt: '2024-05-15T16:00:00.000Z',
    matchScore: 0.87,
  },
  {
    id: 'r-003',
    type: 'report',
    title: 'Audit Trail Export',
    description: 'Full audit trail export for external auditor review',
    status: 'processing',
    createdAt: '2024-10-01T09:00:00.000Z',
    matchScore: 0.8,
  },
  {
    id: 'r-004',
    type: 'report',
    title: 'Regulatory Status Dashboard Report',
    description: 'Current regulatory status across all compliance domains',
    status: 'completed',
    createdAt: '2024-08-15T14:30:00.000Z',
    matchScore: 0.76,
  },
  {
    id: 'r-005',
    type: 'report',
    title: 'Annual Compliance Test Results',
    description: 'Year-end compliance testing results and remediation status',
    status: 'queued',
    createdAt: '2024-11-01T08:00:00.000Z',
    matchScore: 0.72,
  },
];

/**
 * Compute a simple match score based on how well the query matches the title/description.
 */
function computeMatchScore(item: SearchResult, query: string): number {
  const q = query.toLowerCase();
  const titleMatch = item.title.toLowerCase().includes(q);
  const descMatch = item.description.toLowerCase().includes(q);

  if (titleMatch && descMatch) return 0.95;
  if (titleMatch) return 0.85;
  if (descMatch) return 0.7;
  return 0;
}

/**
 * GET /api/search
 *
 * Unified search across compliance records and reports.
 * For MVP, searches mock data using LIKE-based matching.
 * Saves search queries to SearchHistory for suggestion and history features.
 */
export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, type, status, dateFrom, dateTo, page: pageStr, limit: limitStr } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      throw AppError.badRequest('Query parameter "q" is required');
    }

    const query = q.trim();
    const searchType = (type as string) || 'all';
    const page = Math.max(1, parseInt(pageStr as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr as string, 10) || 20));

    // Check cache first (5-minute TTL)
    const cacheKey = `search:${query}:${searchType}:${status || ''}:${page}`;
    const cached = await cache.get<{
      results: SearchResult[];
      total: number;
      page: number;
      limit: number;
      query: string;
    }>(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    // Gather source data based on type filter
    let candidates: SearchResult[] = [];

    if (searchType === 'all' || searchType === 'compliance') {
      candidates = candidates.concat(MOCK_COMPLIANCE);
    }
    if (searchType === 'all' || searchType === 'reports') {
      candidates = candidates.concat(MOCK_REPORTS);
    }

    // Filter by query match (LIKE-based: title or description contains query)
    let results = candidates
      .map((item) => ({
        ...item,
        matchScore: computeMatchScore(item, query),
      }))
      .filter((item) => item.matchScore > 0);

    // Filter by status if provided
    if (status && typeof status === 'string') {
      results = results.filter((item) => item.status === status);
    }

    // Filter by date range if provided
    if (dateFrom && typeof dateFrom === 'string') {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        results = results.filter((item) => new Date(item.createdAt) >= from);
      }
    }
    if (dateTo && typeof dateTo === 'string') {
      const to = new Date(dateTo);
      if (!isNaN(to.getTime())) {
        // Include the full day by setting to end of day
        to.setHours(23, 59, 59, 999);
        results = results.filter((item) => new Date(item.createdAt) <= to);
      }
    }

    // Sort by match score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    const total = results.length;

    // Paginate
    const offset = (page - 1) * limit;
    const paginatedResults = results.slice(offset, offset + limit);

    // Save to search history
    const userId = req.user?.userId;
    if (userId) {
      await SearchHistory.create({
        userId,
        query,
        resultCount: total,
        filters: {
          type: searchType,
          status: status || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        },
      });
    }

    const responseBody = {
      results: paginatedResults,
      total,
      page,
      limit,
      query,
    };

    // Cache the response for 5 minutes (300 seconds)
    await cache.set(cacheKey, responseBody, 300);

    res.status(200).json(responseBody);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/search/suggestions
 *
 * Returns up to 5 recent unique search queries that match the given prefix.
 * Uses LIKE-based matching on SearchHistory for SQLite compatibility.
 */
export async function suggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw AppError.badRequest('Query parameter "q" must be at least 2 characters');
    }

    const prefix = q.trim();
    const userId = req.user?.userId;

    // Check cache first (2-minute TTL)
    const suggestionsCacheKey = `suggestions:${userId || 'anon'}:${prefix}`;
    const cachedSuggestions = await cache.get<{ suggestions: string[] }>(suggestionsCacheKey);
    if (cachedSuggestions) {
      res.status(200).json(cachedSuggestions);
      return;
    }

    const history = await SearchHistory.findAll({
      where: {
        ...(userId ? { userId } : {}),
        query: {
          [Op.like]: `%${prefix}%`,
        },
      },
      order: [['createdAt', 'DESC']],
      attributes: ['query'],
      limit: 20, // fetch more to deduplicate
    });

    // Deduplicate and take up to 5
    const seen = new Set<string>();
    const suggestionList: string[] = [];
    for (const entry of history) {
      const val = entry.query;
      if (!seen.has(val)) {
        seen.add(val);
        suggestionList.push(val);
      }
      if (suggestionList.length >= 5) break;
    }

    const suggestionsResponse = {
      suggestions: suggestionList,
    };

    // Cache suggestions for 2 minutes (120 seconds)
    await cache.set(suggestionsCacheKey, suggestionsResponse, 120);

    res.status(200).json(suggestionsResponse);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/search/history
 *
 * Returns the authenticated user's 20 most recent search history entries.
 */
export async function getSearchHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const history = await SearchHistory.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    res.status(200).json({
      history: history.map((entry) => ({
        id: entry.id,
        query: entry.query,
        resultCount: entry.resultCount,
        filters: entry.filters,
        createdAt: entry.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
