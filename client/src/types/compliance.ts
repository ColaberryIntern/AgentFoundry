export type CalendarEventType = 'deadline' | 'audit' | 'regulatory_change' | 'review' | 'training';
export type CalendarEventStatus =
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';
export type CalendarEventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  date: string;
  endDate: string | null;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  regulationId: string | null;
  metadata: Record<string, unknown> | null;
  reminderDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventCreateInput {
  title: string;
  description?: string;
  eventType: CalendarEventType;
  date: string;
  endDate?: string;
  status?: CalendarEventStatus;
  priority?: CalendarEventPriority;
  regulationId?: string;
  metadata?: Record<string, unknown>;
  reminderDays?: number;
}

export interface CalendarEventUpdateInput {
  title?: string;
  description?: string;
  eventType?: CalendarEventType;
  date?: string;
  endDate?: string;
  status?: CalendarEventStatus;
  priority?: CalendarEventPriority;
  regulationId?: string;
  metadata?: Record<string, unknown>;
  reminderDays?: number;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface UpcomingDeadlinesResponse {
  events: CalendarEvent[];
  total: number;
}

export interface CalendarEventResponse {
  event: CalendarEvent;
}

export interface MarketSignal {
  date: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  industry: string;
}

export interface MarketSignalsResponse {
  signals: MarketSignal[];
  industry: string;
  analyzedAt: string;
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  description: string;
  similarity: number;
  parentCategory?: string;
  regulations: string[];
}

export interface TaxonomyClassificationResponse {
  categories: TaxonomyCategory[];
  classifiedAt: string;
}

export interface RiskAnalysisResult {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number;
  impact: number;
  riskScore: number;
  category: string;
  regulation?: string;
  suggestedAction?: string;
}

export interface CalendarListParams {
  userId?: string;
  eventType?: CalendarEventType;
  dateFrom?: string;
  dateTo?: string;
  status?: CalendarEventStatus;
  page?: number;
  limit?: number;
}

// ===========================================================================
// Registry Types
// ===========================================================================

export interface NaicsIndustry {
  code: string;
  title: string;
  description: string | null;
  level: number;
  parentCode: string | null;
  sector: string;
  versionYear: number;
  lastUpdated: string | null;
  children?: NaicsIndustry[];
  createdAt: string;
  updatedAt: string;
}

export type TaxonomyNodeType = 'industry' | 'process' | 'function' | 'regulation' | 'risk';
export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface TaxonomyNode {
  id: string;
  parentId: string | null;
  nodeType: TaxonomyNodeType;
  name: string;
  description: string | null;
  riskTier: RiskTier;
  dataAccessScope: string | null;
  allowedAgentTypes: string[] | null;
  metadata: Record<string, unknown> | null;
  version: number;
  children?: TaxonomyNode[];
  createdAt: string;
  updatedAt: string;
}

export type OntologyRelationshipType =
  | 'SOLVES'
  | 'OPERATES_IN'
  | 'COMPLIES_WITH'
  | 'TRIGGERS'
  | 'INVALIDATES'
  | 'DEPENDS_ON'
  | 'APPLIES_TO'
  | 'REQUIRES';

export interface OntologyRelationship {
  id: string;
  subjectType: string;
  subjectId: string;
  relationshipType: OntologyRelationshipType;
  objectType: string;
  objectId: string;
  weight: number;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type MonetizationType =
  | 'cost_reduction'
  | 'revenue_generation'
  | 'risk_mitigation'
  | 'compliance_automation';
export type UseCaseStatus = 'draft' | 'active' | 'deprecated';

export interface UseCase {
  id: string;
  outcomeStatement: string;
  measurableKpi: string | null;
  industryScope: string[] | null;
  regulatoryScope: string[] | null;
  urgencyScore: number | null;
  capitalDependencyScore: number | null;
  monetizationType: MonetizationType;
  status: UseCaseStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type SpecializationType =
  | 'compliance_monitor'
  | 'risk_analyzer'
  | 'regulatory_tracker'
  | 'audit_agent'
  | 'data_classifier'
  | 'anomaly_detector'
  | 'report_generator'
  | 'workflow_orchestrator';

export interface AgentSkeleton {
  id: string;
  name: string;
  specializationType: SpecializationType;
  coreCapabilities: string[] | null;
  inputContract: Record<string, unknown> | null;
  outputContract: Record<string, unknown> | null;
  allowedTaxonomyScope: string[] | null;
  communicationProtocol: string;
  riskLevel: RiskTier;
  version: number;
  variants?: AgentVariant[];
  createdAt: string;
  updatedAt: string;
}

export type CertificationStatus = 'uncertified' | 'pending' | 'certified' | 'expired' | 'revoked';

export interface AgentVariant {
  id: string;
  skeletonId: string;
  industryCode: string | null;
  regulationId: string | null;
  name: string;
  configuration: Record<string, unknown> | null;
  thresholdRules: Record<string, unknown> | null;
  certificationStatus: CertificationStatus;
  certificationScore: number | null;
  version: number;
  skeleton?: AgentSkeleton;
  certifications?: CertificationRecord[];
  deployments?: DeploymentInstance[];
  createdAt: string;
  updatedAt: string;
}

export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export interface DeploymentInstance {
  id: string;
  agentStackId: string;
  agentVariantId: string;
  environment: DeploymentEnvironment;
  activeStatus: boolean;
  performanceScore: number | null;
  lastExecution: string | null;
  executionCount: number;
  errorCount: number;
  deployedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CertificationType =
  | 'regulatory_compliance'
  | 'security_audit'
  | 'performance_benchmark'
  | 'data_governance';

export interface CertificationRecord {
  id: string;
  agentVariantId: string;
  certificationType: CertificationType;
  complianceFramework: string;
  bestPracticeScore: number;
  auditPassed: boolean;
  findings: Record<string, unknown> | null;
  expiryDate: string;
  lastReviewed: string | null;
  version: number;
  variant?: AgentVariant;
  createdAt: string;
  updatedAt: string;
}

export type IntelligenceMetricType =
  | 'health'
  | 'coverage'
  | 'compliance_exposure'
  | 'drift'
  | 'expansion_opportunity';

export interface SystemIntelligence {
  id: string;
  metricType: IntelligenceMetricType;
  score: number;
  details: Record<string, unknown> | null;
  computedBy: string;
  computedAt: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StackSimulationResult {
  industryCode: string;
  useCaseId: string | null;
  recommendedAgents: Array<{
    id: string;
    name: string;
    skeleton: string;
    certificationStatus: CertificationStatus;
    certificationScore: number | null;
  }>;
  applicableRegulations: number;
  estimatedCoverage: number;
  readiness: 'high' | 'medium' | 'low';
}
