import api from './api';
import type {
  NaicsIndustry,
  TaxonomyNode,
  OntologyRelationship,
  UseCase,
  AgentSkeleton,
  AgentVariant,
  CertificationRecord,
  DeploymentInstance,
  SystemIntelligence,
  PaginatedResponse,
  StackSimulationResult,
} from '../types/compliance';

export const registryApi = {
  // NAICS Industries
  getIndustries: (params?: { level?: number; sector?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<NaicsIndustry>>('/registry/industries', { params }),

  getIndustryByCode: (code: string) =>
    api.get<{ data: NaicsIndustry }>(`/registry/industries/${code}`),

  getIndustryRegulations: (code: string) =>
    api.get<{ data: TaxonomyNode[]; industryCode: string }>(
      `/registry/industries/${code}/regulations`,
    ),

  // Taxonomy
  getTaxonomyNodes: (params?: {
    node_type?: string;
    risk_tier?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<TaxonomyNode>>('/registry/taxonomy', { params }),

  getTaxonomyNodeById: (id: string) => api.get<{ data: TaxonomyNode }>(`/registry/taxonomy/${id}`),

  // Ontology
  getOntologyRelationships: (params?: {
    subject_type?: string;
    object_type?: string;
    relationship_type?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<OntologyRelationship>>('/registry/ontology', { params }),

  getEntityRelationships: (entityType: string, entityId: string) =>
    api.get<{ data: OntologyRelationship[] }>(`/registry/ontology/${entityType}/${entityId}`),

  // Use Cases
  getUseCases: (params?: {
    status?: string;
    monetization_type?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<UseCase>>('/registry/usecases', { params }),

  getUseCaseById: (id: string) =>
    api.get<{ data: UseCase; relationships: OntologyRelationship[] }>(`/registry/usecases/${id}`),

  // Agent Infrastructure
  getAgentSkeletons: () => api.get<{ data: AgentSkeleton[] }>('/registry/agents/skeletons'),

  getAgentVariants: (params?: {
    industry_code?: string;
    certification_status?: string;
    skeleton_id?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<AgentVariant>>('/registry/agents/variants', { params }),

  getAgentVariantById: (id: string) =>
    api.get<{ data: AgentVariant }>(`/registry/agents/variants/${id}`),

  // Certifications
  getCertifications: (params?: {
    certification_type?: string;
    compliance_framework?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<CertificationRecord>>('/registry/certifications', { params }),

  // Deployments
  getDeployments: (params?: {
    environment?: string;
    active_status?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<DeploymentInstance>>('/registry/deployments', { params }),

  // System Intelligence
  getIntelligence: (params?: { metric_type?: string }) =>
    api.get<{ data: SystemIntelligence[] }>('/registry/intelligence', { params }),

  // Audit Log
  getAuditLog: (params?: {
    entity_type?: string;
    action?: string;
    actor?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<
      PaginatedResponse<{
        id: string;
        actor: string;
        action: string;
        entityType: string;
        entityId: string;
        changes: Record<string, unknown> | null;
        reason: string | null;
        createdAt: string;
      }>
    >('/registry/audit-log', { params }),

  // Actions
  simulateStack: (data: { industry_code: string; use_case_id?: string }) =>
    api.post<{ data: StackSimulationResult }>('/registry/simulate-stack', data),

  deployStack: (data: { agent_variant_id: string; agent_stack_id: string; environment?: string }) =>
    api.post<{ data: DeploymentInstance }>('/registry/deploy-stack', data),
};
