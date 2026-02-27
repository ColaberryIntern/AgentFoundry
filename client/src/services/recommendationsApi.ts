import api from './api';
import type {
  RecommendationsListResponse,
  Recommendation,
  ComplianceAnalysisResponse,
  RegulatoryPredictionsResponse,
  InferenceHealthResponse,
  FeedbackAction,
} from '../types/recommendations';

export interface ListRecommendationsParams {
  userId?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const recommendationsApi = {
  listRecommendations: (params: ListRecommendationsParams) =>
    api.get<RecommendationsListResponse>('/recommendations', { params }),

  getRecommendation: (id: string) =>
    api.get<{ recommendation: Recommendation }>(`/recommendations/${id}`),

  submitFeedback: (recommendationId: string, action: FeedbackAction) =>
    api.post<{ recommendation: Recommendation }>('/recommendations/feedback', {
      recommendationId,
      action,
    }),

  analyzeCompliance: (userId: string) =>
    api.post<ComplianceAnalysisResponse>('/compliance/analyze', { userId }),

  getRegulatoryPredictions: (userId: string) =>
    api.get<RegulatoryPredictionsResponse>('/regulations/predictions', {
      params: { userId },
    }),

  getInferenceHealth: () => api.get<InferenceHealthResponse>('/inference/health'),
};
