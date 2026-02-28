// ===========================================================================
// Orchestrator Types
// ===========================================================================

export type IntentType =
  | 'gap_coverage'
  | 'drift_remediation'
  | 'expansion_opportunity'
  | 'certification_renewal'
  | 'risk_mitigation'
  | 'ontology_evolution'
  | 'taxonomy_expansion'
  | 'marketplace_submission';

export type IntentStatus =
  | 'detected'
  | 'evaluating'
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'simulating'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ActionType =
  | 'create_use_case'
  | 'create_skeleton'
  | 'create_variant'
  | 'deploy_agent'
  | 'recertify_agent'
  | 'adjust_threshold'
  | 'add_ontology_relation'
  | 'add_taxonomy_node'
  | 'pause_deployment'
  | 'update_configuration'
  | 'submit_marketplace'
  | 'generate_report';

export type ActionStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'approved'
  | 'simulating'
  | 'simulation_passed'
  | 'simulation_failed'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type SettingType = 'toggle' | 'slider' | 'select' | 'number';
export type SettingCategory = 'autonomy' | 'guardrails' | 'scheduling' | 'marketplace';

export type GuardrailType =
  | 'budget'
  | 'risk'
  | 'drift'
  | 'taxonomy_boundary'
  | 'rate_limit'
  | 'concurrent_limit'
  | 'production_lock'
  | 'scope_lock';

export type ScanType =
  | 'full'
  | 'gap'
  | 'drift'
  | 'expansion'
  | 'certification'
  | 'ontology'
  | 'marketplace';

export type MarketplaceStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'testing'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'delisted';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface OrchestratorIntent {
  id: string;
  intentType: IntentType;
  sourceSignal: string;
  priority: Priority;
  confidenceScore: number;
  title: string;
  description: string | null;
  context: Record<string, unknown> | null;
  recommendedActions: Record<string, unknown>[] | null;
  status: IntentStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  expiresAt: string | null;
  actions?: OrchestratorAction[];
  createdAt: string;
  updatedAt: string;
}

export interface OrchestratorAction {
  id: string;
  intentId: string;
  actionType: ActionType;
  targetEntityType: string | null;
  targetEntityId: string | null;
  parameters: Record<string, unknown>;
  status: ActionStatus;
  requiresApproval: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  simulationResult: SimulationResult | null;
  executionResult: Record<string, unknown> | null;
  errorMessage: string | null;
  sequenceOrder: number;
  intent?: OrchestratorIntent;
  violations?: GuardrailViolation[];
  createdAt: string;
  updatedAt: string;
}

export interface OrchestratorSetting {
  id: string;
  settingKey: string;
  settingValue: unknown;
  settingType: SettingType;
  category: SettingCategory;
  label: string;
  description: string | null;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: unknown;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuardrailViolation {
  id: string;
  actionId: string | null;
  guardrailType: GuardrailType;
  guardrailKey: string | null;
  violationDetails: Record<string, unknown>;
  severity: 'warning' | 'block';
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  action?: OrchestratorAction;
  createdAt: string;
}

export interface ScanLogEntry {
  id: string;
  scanType: ScanType;
  startedAt: string;
  completedAt: string | null;
  intentsDetected: number;
  actionsCreated: number;
  guardrailsTriggered: number;
  scanContext: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface MarketplaceSubmission {
  id: string;
  submitterId: string;
  agentVariantId: string | null;
  submissionName: string;
  description: string | null;
  documentationUrl: string | null;
  status: MarketplaceStatus;
  reviewNotes: Array<{ reviewer: string; note: string; date: string }> | null;
  certificationRequired: boolean;
  listingMetadata: Record<string, unknown> | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationResult {
  passed: boolean;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  risks: string[];
  violations: string[];
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface OrchestratorDashboard {
  activeIntents: number;
  pendingApprovals: number;
  guardrailViolations: number;
  completedToday: number;
  recentIntents: OrchestratorIntent[];
  recentViolations: GuardrailViolation[];
  autonomyMode: string;
  systemConfidence: number;
}

// ---------------------------------------------------------------------------
// API Response helpers
// ---------------------------------------------------------------------------

export interface PaginatedOrchestratorResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
