export type AgentStackType =
  | 'compliance_monitor'
  | 'risk_analyzer'
  | 'regulatory_tracker'
  | 'audit_agent'
  | 'custom';

export type AgentStackStatus = 'draft' | 'deploying' | 'running' | 'paused' | 'stopped' | 'error';

export type AgentHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface AgentStack {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: AgentStackType;
  status: AgentStackStatus;
  configuration: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  healthStatus: AgentHealthStatus;
  lastHealthCheck: string | null;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStackCreateRequest {
  name: string;
  type: AgentStackType;
  description?: string;
  configuration?: Record<string, unknown>;
}

export interface AgentStackUpdateRequest {
  name?: string;
  description?: string;
  configuration?: Record<string, unknown>;
}

export interface AgentMetrics {
  agentId: string;
  metrics: {
    requests: number;
    errors: number;
    avg_latency: number;
    uptime: number;
  };
  healthStatus: AgentHealthStatus;
  lastHealthCheck: string | null;
  driftAnalysis: Record<string, unknown> | null;
}

export interface AgentOptimization {
  agentId: string;
  optimization: {
    recommendations: string[];
    optimizedConfig?: Record<string, unknown>;
  };
}

export interface AgentListResponse {
  agents: AgentStack[];
  total: number;
  page: number;
  limit: number;
}

export interface AgentListParams {
  userId?: string;
  status?: AgentStackStatus | '';
  type?: AgentStackType | '';
  page?: number;
  limit?: number;
}
