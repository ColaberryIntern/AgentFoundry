import api from './api';
import type {
  AgentStack,
  AgentStackCreateRequest,
  AgentStackUpdateRequest,
  AgentListResponse,
  AgentListParams,
  AgentMetrics,
  AgentOptimization,
} from '../types/agents';

export const agentsApi = {
  listAgents: (params: AgentListParams) => api.get<AgentListResponse>('/agents', { params }),

  getAgent: (id: string) => api.get<AgentStack>(`/agents/${id}`),

  createAgent: (data: AgentStackCreateRequest) => api.post<AgentStack>('/agents', data),

  updateAgent: (id: string, data: AgentStackUpdateRequest) =>
    api.put<AgentStack>(`/agents/${id}`, data),

  deleteAgent: (id: string) => api.delete<{ message: string }>(`/agents/${id}`),

  deployAgent: (id: string) => api.post<AgentStack>(`/agents/${id}/deploy`),

  pauseAgent: (id: string) => api.post<AgentStack>(`/agents/${id}/pause`),

  resumeAgent: (id: string) => api.post<AgentStack>(`/agents/${id}/resume`),

  stopAgent: (id: string) => api.post<AgentStack>(`/agents/${id}/stop`),

  getMetrics: (id: string) => api.get<AgentMetrics>(`/agents/${id}/metrics`),

  optimize: (id: string, constraints?: Record<string, unknown>) =>
    api.post<AgentOptimization>(`/agents/${id}/optimize`, { constraints }),
};
