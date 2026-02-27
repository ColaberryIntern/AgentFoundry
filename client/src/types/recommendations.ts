export type RecommendationType =
  | 'compliance_gap'
  | 'regulatory_prediction'
  | 'optimization'
  | 'risk_alert';

export type RecommendationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RecommendationStatus = 'active' | 'accepted' | 'dismissed' | 'expired';

export type FeedbackAction = 'accept' | 'dismiss';

export interface Recommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number;
  severity: RecommendationSeverity;
  status: RecommendationStatus;
  category?: string;
  metadata?: Record<string, unknown>;
  modelId?: string;
  modelVersion?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationFilters {
  userId?: string;
  type?: RecommendationType | '';
  status?: RecommendationStatus | '';
  severity?: RecommendationSeverity | '';
  page?: number;
  limit?: number;
}

export interface RecommendationsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecommendationsListResponse {
  recommendations: Recommendation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComplianceGap {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: RecommendationSeverity;
  confidence: number;
  category?: string;
  regulation?: string;
  suggestedAction?: string;
}

export interface ComplianceAnalysisResponse {
  gaps: ComplianceGap[];
  analyzedAt: string;
  userId: string;
}

export interface RegulatoryPrediction {
  id: string;
  regulation: string;
  title: string;
  description: string;
  likelihood: number;
  timeframe: string;
  impact: RecommendationSeverity;
  category?: string;
  source?: string;
}

export interface RegulatoryPredictionsResponse {
  predictions: RegulatoryPrediction[];
  generatedAt: string;
  userId: string;
}

export interface InferenceHealthResponse {
  status: 'healthy' | 'degraded' | 'offline';
  modelServer: boolean;
  lastCheck: string;
}
