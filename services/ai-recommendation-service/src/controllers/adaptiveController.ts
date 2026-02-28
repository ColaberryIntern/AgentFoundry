/* eslint-disable no-console */
import { Request, Response, NextFunction } from 'express';
import { UserInteraction } from '../models/UserInteraction';
import { AppError } from '../utils/AppError';
import { intToUuid } from '../utils/intToUuid';

/**
 * Default dashboard layout order. Widgets that the user clicks more
 * frequently will be promoted toward the front.
 */
const DEFAULT_DASHBOARD_LAYOUT = [
  'compliance_overview',
  'metrics_cards',
  'recent_activity',
  'compliance_trend',
  'ai_recommendations',
  'live_feed',
];

/**
 * Known regulation keywords for extraction from search queries and targets.
 */
const KNOWN_REGULATIONS = [
  'GDPR',
  'HIPAA',
  'SOC2',
  'SOC 2',
  'PCI-DSS',
  'PCI DSS',
  'CCPA',
  'SOX',
  'ISO 27001',
  'NIST',
  'FERPA',
  'GLBA',
];

/**
 * Known report types for extraction.
 */
const KNOWN_REPORT_TYPES = [
  'compliance_summary',
  'risk_assessment',
  'audit_report',
  'regulatory_status',
  'incident_report',
];

/**
 * Extract regulation mentions from a text string.
 */
function extractRegulations(text: string): string[] {
  const upper = text.toUpperCase();
  const found = new Set<string>();

  for (const reg of KNOWN_REGULATIONS) {
    if (upper.includes(reg.toUpperCase())) {
      // Normalize: e.g. "SOC 2" -> "SOC2", "PCI DSS" -> "PCI-DSS"
      const normalized = reg.replace(/\s+/g, '').replace('PCIDSS', 'PCI-DSS');
      found.add(normalized);
    }
  }

  return Array.from(found);
}

/**
 * GET /api/adaptive/preferences/:userId
 *
 * Compute personalized preferences from user interaction history.
 * Uses a simple collaborative filtering / frequency-based approach.
 */
export async function getAdaptivePreferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId: rawUserId } = req.params;

    if (!rawUserId) {
      throw AppError.badRequest('userId parameter is required');
    }

    const userId = intToUuid(rawUserId);

    const interactions = await UserInteraction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    // Empty preferences for a new user
    if (interactions.length === 0) {
      res.status(200).json({
        userId,
        dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
        preferredComplianceAreas: [],
        preferredReportTypes: [],
        topFeatures: [],
        activityLevel: {
          total: 0,
          avgPerDay: 0,
          peakHour: null,
        },
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    // ---------------------------------------------------------------
    // Dashboard widget preferences
    // ---------------------------------------------------------------
    const widgetClicks: Record<string, number> = {};
    for (const interaction of interactions) {
      if (interaction.interactionType === 'dashboard_widget_click') {
        widgetClicks[interaction.target] = (widgetClicks[interaction.target] || 0) + 1;
      }
    }

    // Build dashboard layout by promoting frequently-clicked widgets
    const sortedWidgets = Object.entries(widgetClicks)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const dashboardLayout = [
      ...sortedWidgets,
      ...DEFAULT_DASHBOARD_LAYOUT.filter((w) => !sortedWidgets.includes(w)),
    ];

    // ---------------------------------------------------------------
    // Preferred compliance areas
    // ---------------------------------------------------------------
    const complianceCounts: Record<string, number> = {};
    for (const interaction of interactions) {
      if (
        interaction.interactionType === 'search' ||
        interaction.interactionType === 'recommendation_click'
      ) {
        // Extract from target
        const regs = extractRegulations(interaction.target);
        for (const reg of regs) {
          complianceCounts[reg] = (complianceCounts[reg] || 0) + 1;
        }

        // Extract from metadata (e.g. search query)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta = interaction.metadata as Record<string, any> | null;
        if (meta?.query && typeof meta.query === 'string') {
          const metaRegs = extractRegulations(meta.query);
          for (const reg of metaRegs) {
            complianceCounts[reg] = (complianceCounts[reg] || 0) + 1;
          }
        }
        if (meta?.category && typeof meta.category === 'string') {
          const catRegs = extractRegulations(meta.category);
          for (const reg of catRegs) {
            complianceCounts[reg] = (complianceCounts[reg] || 0) + 1;
          }
        }
      }
    }

    const preferredComplianceAreas = Object.entries(complianceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // ---------------------------------------------------------------
    // Preferred report types
    // ---------------------------------------------------------------
    const reportCounts: Record<string, number> = {};
    for (const interaction of interactions) {
      if (interaction.interactionType === 'report_generate') {
        const target = interaction.target.toLowerCase();
        // Try to match known report types
        let matched = false;
        for (const rt of KNOWN_REPORT_TYPES) {
          if (target.includes(rt.replace(/_/g, ' ')) || target.includes(rt)) {
            reportCounts[rt] = (reportCounts[rt] || 0) + 1;
            matched = true;
          }
        }
        // If no known type matched, use the raw target
        if (!matched) {
          reportCounts[interaction.target] = (reportCounts[interaction.target] || 0) + 1;
        }
      }
    }

    const preferredReportTypes = Object.entries(reportCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // ---------------------------------------------------------------
    // Top features — time-weighted scoring
    // ---------------------------------------------------------------
    const now = Date.now();
    const DECAY_HALF_LIFE = 7 * 24 * 60 * 60 * 1000; // 7 days
    const featureScores: Record<string, number> = {};

    for (const interaction of interactions) {
      if (
        interaction.interactionType === 'feature_use' ||
        interaction.interactionType === 'search' ||
        interaction.interactionType === 'recommendation_click'
      ) {
        const age = now - new Date(interaction.createdAt).getTime();
        const weight = Math.exp(-age / DECAY_HALF_LIFE);
        const key = interaction.target;
        featureScores[key] = (featureScores[key] || 0) + weight;
      }
    }

    const maxFeatureScore = Math.max(...Object.values(featureScores), 1);
    const topFeatures = Object.entries(featureScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, score]) => ({
        name,
        score: Math.round((score / maxFeatureScore) * 100) / 100,
      }));

    // ---------------------------------------------------------------
    // Activity level
    // ---------------------------------------------------------------
    const firstInteraction = interactions[interactions.length - 1];
    const lastInteraction = interactions[0];

    const daySpan = Math.max(
      1,
      Math.ceil(
        (new Date(lastInteraction.createdAt).getTime() -
          new Date(firstInteraction.createdAt).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );

    const avgPerDay = Math.round((interactions.length / daySpan) * 10) / 10;

    // Peak hour calculation
    const hourCounts: Record<number, number> = {};
    for (const interaction of interactions) {
      const hour = new Date(interaction.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    let peakHour = 0;
    let peakCount = 0;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > peakCount) {
        peakCount = count;
        peakHour = parseInt(hour, 10);
      }
    }

    // ---------------------------------------------------------------
    // Response
    // ---------------------------------------------------------------
    res.status(200).json({
      userId,
      dashboardLayout,
      preferredComplianceAreas,
      preferredReportTypes,
      topFeatures,
      activityLevel: {
        total: interactions.length,
        avgPerDay,
        peakHour,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
