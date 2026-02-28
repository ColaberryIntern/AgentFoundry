import api from './api';
import type {
  OrchestratorDashboard,
  OrchestratorIntent,
  OrchestratorAction,
  OrchestratorSetting,
  GuardrailViolation,
  ScanLogEntry,
  MarketplaceSubmission,
  PaginatedOrchestratorResponse,
} from '../types/orchestrator';

export const orchestratorApi = {
  // Dashboard
  getDashboard: () => api.get<{ data: OrchestratorDashboard }>('/registry/orchestrator/dashboard'),

  // Intents
  getIntents: (params?: {
    status?: string;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<PaginatedOrchestratorResponse<OrchestratorIntent>>('/registry/orchestrator/intents', {
      params,
    }),

  getIntentById: (id: string) =>
    api.get<{ data: OrchestratorIntent; actions: OrchestratorAction[] }>(
      `/registry/orchestrator/intents/${id}`,
    ),

  approveIntent: (id: string, data?: { reason?: string }) =>
    api.post<{ data: OrchestratorIntent }>(`/registry/orchestrator/intents/${id}/approve`, data),

  rejectIntent: (id: string, data: { reason: string }) =>
    api.post<{ data: OrchestratorIntent }>(`/registry/orchestrator/intents/${id}/reject`, data),

  cancelIntent: (id: string, data?: { reason?: string }) =>
    api.post<{ data: OrchestratorIntent }>(`/registry/orchestrator/intents/${id}/cancel`, data),

  // Actions
  getActions: (params?: { status?: string; intent_id?: string; page?: number; limit?: number }) =>
    api.get<PaginatedOrchestratorResponse<OrchestratorAction>>('/registry/orchestrator/actions', {
      params,
    }),

  getActionById: (id: string) =>
    api.get<{ data: OrchestratorAction }>(`/registry/orchestrator/actions/${id}`),

  approveAction: (id: string, data?: { reason?: string }) =>
    api.post<{ data: OrchestratorAction }>(`/registry/orchestrator/actions/${id}/approve`, data),

  rejectAction: (id: string, data: { reason: string }) =>
    api.post<{ data: OrchestratorAction }>(`/registry/orchestrator/actions/${id}/reject`, data),

  // Settings
  getSettings: (params?: { category?: string }) =>
    api.get<{ data: OrchestratorSetting[] }>('/registry/orchestrator/settings', { params }),

  updateSetting: (key: string, data: { value: unknown }) =>
    api.put<{ data: OrchestratorSetting }>(`/registry/orchestrator/settings/${key}`, data),

  // Violations
  getViolations: (params?: { resolved?: string; page?: number; limit?: number }) =>
    api.get<PaginatedOrchestratorResponse<GuardrailViolation>>(
      '/registry/orchestrator/violations',
      { params },
    ),

  resolveViolation: (id: string, data: { reason: string }) =>
    api.post<{ data: GuardrailViolation }>(`/registry/orchestrator/violations/${id}/resolve`, data),

  // Scans
  getScans: (params?: { scan_type?: string; page?: number; limit?: number }) =>
    api.get<PaginatedOrchestratorResponse<ScanLogEntry>>('/registry/orchestrator/scans', {
      params,
    }),

  // Marketplace
  getMarketplace: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<PaginatedOrchestratorResponse<MarketplaceSubmission>>(
      '/registry/orchestrator/marketplace',
      { params },
    ),

  createMarketplaceSubmission: (data: {
    agent_variant_id: string;
    name: string;
    description?: string;
    documentation_url?: string;
  }) => api.post<{ data: MarketplaceSubmission }>('/registry/orchestrator/marketplace', data),

  reviewMarketplaceSubmission: (
    id: string,
    data: { status: 'approved' | 'rejected'; notes: string },
  ) =>
    api.put<{ data: MarketplaceSubmission }>(
      `/registry/orchestrator/marketplace/${id}/review`,
      data,
    ),
};
