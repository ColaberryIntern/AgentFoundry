import type { Node, Edge } from '@xyflow/react';

// ---------------------------------------------------------------------------
// Node & Edge Type Enums
// ---------------------------------------------------------------------------

export type GraphNodeType =
  | 'industry'
  | 'useCase'
  | 'skeleton'
  | 'variant'
  | 'certification'
  | 'deployment'
  | 'risk'
  | 'marketplace'
  | 'industryCluster'
  | 'useCaseCluster'
  | 'stackCluster';

export type GraphEdgeType =
  | 'hierarchical'
  | 'semantic'
  | 'operates_in'
  | 'solves'
  | 'complies_with'
  | 'depends_on'
  | 'template'
  | 'deploys'
  | 'certifies';

// ---------------------------------------------------------------------------
// View Modes
// ---------------------------------------------------------------------------

export type ViewMode =
  | 'strategy'
  | 'governance'
  | 'architecture'
  | 'performance'
  | 'marketplace'
  | 'simulation';

export type NodeEmphasis = 'primary' | 'secondary' | 'muted' | 'hidden';

// ---------------------------------------------------------------------------
// Graph Node Data (stored in ReactFlow node.data)
// ---------------------------------------------------------------------------

export interface BaseNodeData {
  nodeType: GraphNodeType;
  label: string;
  sublabel?: string;
  status?: string;
  emphasis: NodeEmphasis;
  selected: boolean;
  opacity: number;
  [key: string]: unknown;
}

export interface IndustryNodeData extends BaseNodeData {
  nodeType: 'industry';
  code: string;
  title: string;
  sector: string;
  level: number;
  useCaseCount: number;
  variantCount: number;
  certifiedCount: number;
  // Optional KPI metrics for full-bubble rendering at INDUSTRY center
  metrics?: {
    certHealthPercent: number;
    riskIndex: number;
    coveragePercent: number;
    volatilityScore: number;
    activeDeployments: number;
    errorRate: number;
    totalCount: number;
    certifiedCount: number;
  };
  riskColor?: string;
  certRingColor?: string;
  bubbleSize?: number;
  volatilityScore?: number;
  coveragePercent?: number;
  revenueScore?: number;
}

export interface UseCaseNodeData extends BaseNodeData {
  nodeType: 'useCase';
  outcomeStatement: string;
  monetizationType: string;
  urgencyScore: number | null;
  regulatoryScope: string[];
  industryScope: string[];
  kpi: string | null;
  // Optional KPI metrics for full-bubble rendering at USE_CASE center
  stackCount?: number;
  agentCount?: number;
  deploymentCount?: number;
  metrics?: {
    certHealthPercent: number;
    riskIndex: number;
    coveragePercent: number;
    volatilityScore: number;
    activeDeployments: number;
    errorRate: number;
    totalCount: number;
    certifiedCount: number;
  };
  riskColor?: string;
  certRingColor?: string;
  bubbleSize?: number;
  volatilityScore?: number;
  coveragePercent?: number;
  revenueScore?: number;
}

export interface SkeletonNodeData extends BaseNodeData {
  nodeType: 'skeleton';
  name: string;
  specializationType: string;
  capabilities: string[];
  riskLevel: string;
  variantCount: number;
}

export interface VariantNodeData extends BaseNodeData {
  nodeType: 'variant';
  name: string;
  industryCode: string | null;
  certificationStatus: string;
  certificationScore: number | null;
  skeletonId: string;
  skeletonName?: string;
}

export interface CertificationNodeData extends BaseNodeData {
  nodeType: 'certification';
  certificationType: string;
  complianceFramework: string;
  bestPracticeScore: number;
  auditPassed: boolean;
  expiryDate: string;
  variantId: string;
}

export interface DeploymentNodeData extends BaseNodeData {
  nodeType: 'deployment';
  environment: string;
  activeStatus: boolean;
  performanceScore: number | null;
  executionCount: number;
  errorCount: number;
  variantId: string;
}

export interface RiskNodeData extends BaseNodeData {
  nodeType: 'risk';
  severity: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  category: string;
  regulation?: string;
}

export interface MarketplaceNodeData extends BaseNodeData {
  nodeType: 'marketplace';
  submissionName: string;
  marketplaceStatus: string;
  certificationRequired: boolean;
  variantId: string | null;
  submitterId: string;
}

export type GraphNodeData =
  | IndustryNodeData
  | UseCaseNodeData
  | SkeletonNodeData
  | VariantNodeData
  | CertificationNodeData
  | DeploymentNodeData
  | RiskNodeData
  | MarketplaceNodeData;

// ---------------------------------------------------------------------------
// Graph Edge Data
// ---------------------------------------------------------------------------

export interface GraphEdgeData {
  edgeType: GraphEdgeType;
  label?: string;
  weight?: number;
  relationshipType?: string;
  animated?: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// ReactFlow typed aliases
// ---------------------------------------------------------------------------

export type GraphNode = Node<GraphNodeData>;
export type GraphEdge = Edge<GraphEdgeData>;

// ---------------------------------------------------------------------------
// Context Menu
// ---------------------------------------------------------------------------

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
  nodeType: GraphNodeType;
}

// ---------------------------------------------------------------------------
// Mode Config
// ---------------------------------------------------------------------------

export interface ModeConfig {
  id: ViewMode;
  label: string;
  description: string;
  nodeEmphasis: Record<GraphNodeType, NodeEmphasis>;
  layoutDirection: 'TB' | 'LR' | 'radial';
  edgeFilter?: (edge: GraphEdge) => boolean;
}

// ---------------------------------------------------------------------------
// Node color mapping
// ---------------------------------------------------------------------------

export const NODE_COLORS: Record<
  GraphNodeType,
  { bg: string; border: string; text: string; glow: string }
> = {
  industry: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  useCase: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
  skeleton: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
  variant: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/20',
  },
  certification: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  deployment: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    glow: 'shadow-indigo-500/20',
  },
  risk: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
  },
  marketplace: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    glow: 'shadow-pink-500/20',
  },
  industryCluster: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  useCaseCluster: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
  stackCluster: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
};

export const NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  industry: 'Industry',
  useCase: 'Use Case',
  skeleton: 'Agent Type',
  variant: 'Variant',
  certification: 'Certification',
  deployment: 'Deployment',
  risk: 'Risk',
  marketplace: 'Marketplace',
  industryCluster: 'Industry Cluster',
  useCaseCluster: 'Use Case Cluster',
  stackCluster: 'Stack Cluster',
};

export const NODE_TYPE_ABBREVS: Record<GraphNodeType, string> = {
  industry: 'IND',
  useCase: 'UC',
  skeleton: 'SKL',
  variant: 'VAR',
  certification: 'CRT',
  deployment: 'DEP',
  risk: 'RSK',
  marketplace: 'MKT',
  industryCluster: 'IND',
  useCaseCluster: 'UC',
  stackCluster: 'STK',
};
