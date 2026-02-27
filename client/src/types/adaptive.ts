export interface UserInteraction {
  interactionType:
    | 'page_view'
    | 'feature_use'
    | 'search'
    | 'recommendation_click'
    | 'report_generate'
    | 'filter_apply'
    | 'dashboard_widget_click';
  target: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  duration?: number;
}

export interface AdaptivePreferences {
  userId: string;
  dashboardLayout: string[];
  preferredComplianceAreas: string[];
  preferredReportTypes: string[];
  topFeatures: { name: string; score: number }[];
  activityLevel: { total: number; avgPerDay: number; peakHour: number };
  lastUpdated: string;
}

export interface NLSearchResult {
  intent: string;
  confidence: number;
  entities: { type: string; value: string }[];
  structuredQuery: {
    query: string;
    type: string | null;
    status: string | null;
    dateFrom?: string;
    dateTo?: string;
  };
  results: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    description: string;
    score: number;
    updatedAt: string;
  }>;
  interpretation: string;
}
