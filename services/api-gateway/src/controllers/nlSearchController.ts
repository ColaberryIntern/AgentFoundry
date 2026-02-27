/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchIntent =
  | 'compliance_search'
  | 'report_search'
  | 'user_search'
  | 'system_search'
  | 'general_search';

export interface ExtractedEntity {
  type: 'regulation' | 'status' | 'date' | 'severity' | 'report_type';
  value: string;
}

export interface StructuredQuery {
  query: string;
  type: string | null;
  status: string | null;
  severity: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  reportType: string | null;
}

export interface NLSearchResponse {
  intent: SearchIntent;
  confidence: number;
  entities: ExtractedEntity[];
  structuredQuery: StructuredQuery;
  results: any[];
  interpretation: string;
}

// ---------------------------------------------------------------------------
// Intent Classification — keyword + regex based
// ---------------------------------------------------------------------------

interface IntentRule {
  intent: SearchIntent;
  keywords: string[];
  patterns: RegExp[];
  weight: number;
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'compliance_search',
    keywords: [
      'compliance',
      'regulation',
      'regulatory',
      'gdpr',
      'hipaa',
      'soc2',
      'soc 2',
      'pci-dss',
      'pci dss',
      'ccpa',
      'sox',
      'iso 27001',
      'nist',
      'ferpa',
      'glba',
      'compliant',
      'non-compliant',
      'non compliant',
      'audit',
      'policy',
      'framework',
    ],
    patterns: [
      /\b(comply|compliance|compliant)\b/i,
      /\b(regulat(ion|ory|ed|e))\b/i,
      /\b(gdpr|hipaa|soc\s?2|pci[\s-]?dss|ccpa|sox|iso\s?27001|nist|ferpa|glba)\b/i,
    ],
    weight: 1.0,
  },
  {
    intent: 'report_search',
    keywords: [
      'report',
      'reports',
      'document',
      'documents',
      'generate',
      'export',
      'summary',
      'assessment',
      'audit report',
      'risk assessment',
      'compliance summary',
    ],
    patterns: [
      /\b(report|reports|document|documents)\b/i,
      /\b(generat(e|ing|ed)|export(ing|ed)?)\b/i,
      /\b(summary|assessment)\b/i,
    ],
    weight: 0.9,
  },
  {
    intent: 'user_search',
    keywords: [
      'user',
      'users',
      'role',
      'roles',
      'permission',
      'permissions',
      'admin',
      'account',
      'team',
      'member',
    ],
    patterns: [
      /\b(user|users|account|accounts)\b/i,
      /\b(role|roles|permission|permissions)\b/i,
      /\b(team|member|admin)\b/i,
    ],
    weight: 0.85,
  },
  {
    intent: 'system_search',
    keywords: [
      'system',
      'health',
      'status',
      'agent',
      'agents',
      'service',
      'uptime',
      'performance',
      'monitoring',
      'infrastructure',
    ],
    patterns: [
      /\b(system|health|uptime)\b/i,
      /\b(agent|agents|service|services)\b/i,
      /\b(monitor(ing)?|performance|infrastructure)\b/i,
    ],
    weight: 0.8,
  },
];

/**
 * Classify the intent of a natural language search query.
 * Returns the best-matching intent and a confidence score.
 */
export function classifyIntent(query: string): { intent: SearchIntent; confidence: number } {
  const lower = query.toLowerCase();
  const scores: Record<SearchIntent, number> = {
    compliance_search: 0,
    report_search: 0,
    user_search: 0,
    system_search: 0,
    general_search: 0,
  };

  for (const rule of INTENT_RULES) {
    let matchCount = 0;

    // Keyword matches
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        matchCount++;
      }
    }

    // Pattern matches
    for (const pattern of rule.patterns) {
      if (pattern.test(query)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Score = (matches / total possible matches) * weight
      const totalPossible = rule.keywords.length + rule.patterns.length;
      scores[rule.intent] = (matchCount / totalPossible) * rule.weight;
    }
  }

  // Find the best intent
  let bestIntent: SearchIntent = 'general_search';
  let bestScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as SearchIntent;
    }
  }

  // Confidence: scale score to 0-1 range (minimum 0.3 for general, higher for matches)
  const confidence = bestScore > 0 ? Math.min(0.95, 0.5 + bestScore * 0.5) : 0.3;

  return { intent: bestIntent, confidence: Math.round(confidence * 100) / 100 };
}

// ---------------------------------------------------------------------------
// Entity Extraction
// ---------------------------------------------------------------------------

const REGULATION_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bgdpr\b/i, value: 'GDPR' },
  { pattern: /\bhipaa\b/i, value: 'HIPAA' },
  { pattern: /\bsoc\s?2\b/i, value: 'SOC2' },
  { pattern: /\bpci[\s-]?dss\b/i, value: 'PCI-DSS' },
  { pattern: /\bccpa\b/i, value: 'CCPA' },
  { pattern: /\bsox\b/i, value: 'SOX' },
  { pattern: /\biso\s?27001\b/i, value: 'ISO 27001' },
  { pattern: /\bnist\b/i, value: 'NIST' },
  { pattern: /\bferpa\b/i, value: 'FERPA' },
  { pattern: /\bglba\b/i, value: 'GLBA' },
];

const STATUS_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bnon[\s-]?compliant\b/i, value: 'non_compliant' },
  { pattern: /\bcompliant\b/i, value: 'compliant' },
  { pattern: /\bpending\b/i, value: 'pending' },
  { pattern: /\breview\b/i, value: 'review' },
];

const SEVERITY_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bcritical\b/i, value: 'critical' },
  { pattern: /\bhigh\b/i, value: 'high' },
  { pattern: /\bmedium\b/i, value: 'medium' },
  { pattern: /\blow\b/i, value: 'low' },
];

const REPORT_TYPE_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bcompliance[\s_]summary\b/i, value: 'compliance_summary' },
  { pattern: /\brisk[\s_]assessment\b/i, value: 'risk_assessment' },
  { pattern: /\baudit[\s_]report\b/i, value: 'audit_report' },
  { pattern: /\bregulatory[\s_]status\b/i, value: 'regulatory_status' },
  { pattern: /\bincident[\s_]report\b/i, value: 'incident_report' },
];

/**
 * Date reference patterns — maps natural language date references to date ranges.
 */
function extractDateReferences(query: string): Array<{ type: 'date'; value: string }> {
  const entities: Array<{ type: 'date'; value: string }> = [];
  const lower = query.toLowerCase();

  if (/\blast\s+week\b/.test(lower)) {
    entities.push({ type: 'date', value: 'last_week' });
  }
  if (/\bthis\s+week\b/.test(lower)) {
    entities.push({ type: 'date', value: 'this_week' });
  }
  if (/\blast\s+month\b/.test(lower)) {
    entities.push({ type: 'date', value: 'last_month' });
  }
  if (/\bthis\s+month\b/.test(lower)) {
    entities.push({ type: 'date', value: 'this_month' });
  }
  if (/\bthis\s+year\b/.test(lower)) {
    entities.push({ type: 'date', value: 'this_year' });
  }
  if (/\blast\s+year\b/.test(lower)) {
    entities.push({ type: 'date', value: 'last_year' });
  }

  // Match explicit years like "2024", "2025"
  const yearMatch = query.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    entities.push({ type: 'date', value: yearMatch[1] });
  }

  return entities;
}

/**
 * Extract all entities from a natural language search query.
 */
export function extractEntities(query: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Regulations
  for (const { pattern, value } of REGULATION_PATTERNS) {
    if (pattern.test(query)) {
      entities.push({ type: 'regulation', value });
    }
  }

  // Statuses — check non-compliant before compliant to avoid false matches
  for (const { pattern, value } of STATUS_PATTERNS) {
    if (pattern.test(query)) {
      entities.push({ type: 'status', value });
    }
  }

  // Severities
  for (const { pattern, value } of SEVERITY_PATTERNS) {
    if (pattern.test(query)) {
      entities.push({ type: 'severity', value });
    }
  }

  // Report types
  for (const { pattern, value } of REPORT_TYPE_PATTERNS) {
    if (pattern.test(query)) {
      entities.push({ type: 'report_type', value });
    }
  }

  // Date references
  const dateEntities = extractDateReferences(query);
  entities.push(...dateEntities);

  return entities;
}

// ---------------------------------------------------------------------------
// Query Construction
// ---------------------------------------------------------------------------

/**
 * Convert date reference value to actual dateFrom/dateTo.
 */
function resolveDateRange(dateValue: string): { dateFrom: string | null; dateTo: string | null } {
  const now = new Date();

  switch (dateValue) {
    case 'last_week': {
      const end = new Date(now);
      end.setDate(end.getDate() - end.getDay()); // last Sunday
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0],
      };
    }
    case 'this_week': {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: now.toISOString().split('T')[0],
      };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0],
      };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: now.toISOString().split('T')[0],
      };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: now.toISOString().split('T')[0],
      };
    }
    case 'last_year': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return {
        dateFrom: start.toISOString().split('T')[0],
        dateTo: end.toISOString().split('T')[0],
      };
    }
    default: {
      // Explicit year like "2024"
      if (/^\d{4}$/.test(dateValue)) {
        const year = parseInt(dateValue, 10);
        return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
      }
      return { dateFrom: null, dateTo: null };
    }
  }
}

/**
 * Build a structured query from the intent and extracted entities.
 */
export function buildStructuredQuery(
  originalQuery: string,
  intent: SearchIntent,
  entities: ExtractedEntity[],
): StructuredQuery {
  const structured: StructuredQuery = {
    query: originalQuery,
    type: null,
    status: null,
    severity: null,
    dateFrom: null,
    dateTo: null,
    reportType: null,
  };

  // Map intent to search type
  switch (intent) {
    case 'compliance_search':
      structured.type = 'compliance';
      break;
    case 'report_search':
      structured.type = 'reports';
      break;
    default:
      structured.type = 'all';
  }

  // Apply entities
  for (const entity of entities) {
    switch (entity.type) {
      case 'regulation':
        // Use the regulation as the query term if it is more specific
        structured.query = entity.value;
        break;
      case 'status':
        structured.status = entity.value;
        break;
      case 'severity':
        structured.severity = entity.value;
        break;
      case 'date': {
        const { dateFrom, dateTo } = resolveDateRange(entity.value);
        if (dateFrom) structured.dateFrom = dateFrom;
        if (dateTo) structured.dateTo = dateTo;
        break;
      }
      case 'report_type':
        structured.reportType = entity.value;
        break;
    }
  }

  return structured;
}

/**
 * Generate a human-readable interpretation of the search.
 */
export function buildInterpretation(
  intent: SearchIntent,
  entities: ExtractedEntity[],
  originalQuery: string,
): string {
  const parts: string[] = [];

  switch (intent) {
    case 'compliance_search':
      parts.push('Searching for compliance records');
      break;
    case 'report_search':
      parts.push('Searching for reports');
      break;
    case 'user_search':
      parts.push('Searching for users');
      break;
    case 'system_search':
      parts.push('Searching system status');
      break;
    default:
      parts.push('Searching');
  }

  const regulations = entities.filter((e) => e.type === 'regulation');
  if (regulations.length > 0) {
    parts.push(`related to ${regulations.map((r) => r.value).join(', ')}`);
  }

  const statuses = entities.filter((e) => e.type === 'status');
  if (statuses.length > 0) {
    parts.push(`with status ${statuses.map((s) => s.value).join(', ')}`);
  }

  const severities = entities.filter((e) => e.type === 'severity');
  if (severities.length > 0) {
    parts.push(`at ${severities.map((s) => s.value).join(', ')} severity`);
  }

  const dates = entities.filter((e) => e.type === 'date');
  if (dates.length > 0) {
    parts.push(`for ${dates.map((d) => d.value.replace(/_/g, ' ')).join(', ')}`);
  }

  if (parts.length === 1 && originalQuery) {
    parts.push(`for "${originalQuery}"`);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Mock search (reuses the gateway's mock data approach)
// ---------------------------------------------------------------------------

interface MockResult {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  matchScore: number;
}

const MOCK_COMPLIANCE: MockResult[] = [
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

const MOCK_REPORTS: MockResult[] = [
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
 * Simple match score — same approach as the existing search controller.
 */
function computeMatchScore(item: MockResult, query: string): number {
  const q = query.toLowerCase();
  const titleMatch = item.title.toLowerCase().includes(q);
  const descMatch = item.description.toLowerCase().includes(q);

  if (titleMatch && descMatch) return 0.95;
  if (titleMatch) return 0.85;
  if (descMatch) return 0.7;
  return 0;
}

/**
 * Run a mock search using the structured query.
 */
function executeSearch(structuredQuery: StructuredQuery): MockResult[] {
  let candidates: MockResult[] = [];

  if (
    !structuredQuery.type ||
    structuredQuery.type === 'all' ||
    structuredQuery.type === 'compliance'
  ) {
    candidates = candidates.concat(MOCK_COMPLIANCE);
  }
  if (
    !structuredQuery.type ||
    structuredQuery.type === 'all' ||
    structuredQuery.type === 'reports'
  ) {
    candidates = candidates.concat(MOCK_REPORTS);
  }

  // Filter by query match
  let results = candidates
    .map((item) => ({
      ...item,
      matchScore: computeMatchScore(item, structuredQuery.query),
    }))
    .filter((item) => item.matchScore > 0);

  // Filter by status
  if (structuredQuery.status) {
    results = results.filter((item) => item.status === structuredQuery.status);
  }

  // Sort by match score
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * POST /api/search/natural
 *
 * Natural language search endpoint. Classifies intent, extracts entities,
 * builds a structured query, and returns results with interpretation.
 */
export async function naturalLanguageSearch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw AppError.badRequest('query field is required and must be a non-empty string');
    }

    const trimmedQuery = query.trim();

    // 1. Classify intent
    const { intent, confidence } = classifyIntent(trimmedQuery);

    // 2. Extract entities
    const entities = extractEntities(trimmedQuery);

    // 3. Build structured query
    const structuredQuery = buildStructuredQuery(trimmedQuery, intent, entities);

    // 4. Execute search
    const results = executeSearch(structuredQuery);

    // 5. Build interpretation
    const interpretation = buildInterpretation(intent, entities, trimmedQuery);

    const response: NLSearchResponse = {
      intent,
      confidence,
      entities,
      structuredQuery,
      results,
      interpretation,
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}
