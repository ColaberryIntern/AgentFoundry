import type { ViewMode } from '../types/graphTypes';

// ---------------------------------------------------------------------------
// Altitude Levels
// ---------------------------------------------------------------------------

export type AltitudeLevel = 'GLOBAL' | 'INDUSTRY' | 'USE_CASE' | 'STACK' | 'AGENT';

export const ALTITUDE_ORDER: AltitudeLevel[] = ['GLOBAL', 'INDUSTRY', 'USE_CASE', 'STACK', 'AGENT'];

export const ALTITUDE_DEPTH: Record<AltitudeLevel, number> = {
  GLOBAL: 0,
  INDUSTRY: 1,
  USE_CASE: 2,
  STACK: 3,
  AGENT: 4,
};

export const ALTITUDE_LABELS: Record<AltitudeLevel, string> = {
  GLOBAL: 'Global Intelligence',
  INDUSTRY: 'Industry',
  USE_CASE: 'Use Case',
  STACK: 'Stack Architecture',
  AGENT: 'Agent Detail',
};

// ---------------------------------------------------------------------------
// Altitude Context — what entity is focused at each level
// ---------------------------------------------------------------------------

export interface AltitudeContext {
  sectorId: string | null;
  industryCode: string | null;
  useCaseId: string | null;
  skeletonId: string | null;
  variantId: string | null;
}

export const EMPTY_ALTITUDE_CONTEXT: AltitudeContext = {
  sectorId: null,
  industryCode: null,
  useCaseId: null,
  skeletonId: null,
  variantId: null,
};

// ---------------------------------------------------------------------------
// Cluster Metrics — aggregated data for cluster bubbles
// ---------------------------------------------------------------------------

export interface ClusterMetrics {
  totalCount: number;
  certifiedCount: number;
  certHealthPercent: number; // 0-100
  riskIndex: number; // 0-100
  coveragePercent: number; // 0-100
  volatilityScore: number; // 0-100
  activeDeployments: number;
  errorRate: number; // 0-1
}

export const EMPTY_CLUSTER_METRICS: ClusterMetrics = {
  totalCount: 0,
  certifiedCount: 0,
  certHealthPercent: 0,
  riskIndex: 0,
  coveragePercent: 0,
  volatilityScore: 0,
  activeDeployments: 0,
  errorRate: 0,
};

// ---------------------------------------------------------------------------
// Altitude Config — per-level rendering rules
// ---------------------------------------------------------------------------

export type LayoutStrategy = 'force' | 'dagre-TB' | 'dagre-LR' | 'radial';

export interface AltitudeConfig {
  level: AltitudeLevel;
  label: string;
  description: string;
  visibleNodeTypes: string[];
  layoutStrategy: LayoutStrategy;
  maxVisibleNodes: number;
  nodeDimensions: { width: number; height: number };
}

export const ALTITUDE_CONFIGS: Record<AltitudeLevel, AltitudeConfig> = {
  GLOBAL: {
    level: 'GLOBAL',
    label: 'Global Intelligence',
    description: 'Industry clusters sized by use case count, colored by risk',
    visibleNodeTypes: ['industryCluster'],
    layoutStrategy: 'force',
    maxVisibleNodes: 100,
    nodeDimensions: { width: 160, height: 160 },
  },
  INDUSTRY: {
    level: 'INDUSTRY',
    label: 'Industry Detail',
    description: 'Use case clusters within selected industry',
    visibleNodeTypes: ['industry', 'useCaseCluster'],
    layoutStrategy: 'radial',
    maxVisibleNodes: 150,
    nodeDimensions: { width: 180, height: 180 },
  },
  USE_CASE: {
    level: 'USE_CASE',
    label: 'Use Case Detail',
    description: 'Stack templates for selected use case',
    visibleNodeTypes: ['useCase', 'stackCluster'],
    layoutStrategy: 'dagre-TB',
    maxVisibleNodes: 200,
    nodeDimensions: { width: 160, height: 160 },
  },
  STACK: {
    level: 'STACK',
    label: 'Stack Architecture',
    description: 'Agent variants, data contracts, flow arrows',
    visibleNodeTypes: ['skeleton', 'variant', 'certification', 'deployment'],
    layoutStrategy: 'dagre-LR',
    maxVisibleNodes: 200,
    nodeDimensions: { width: 200, height: 80 },
  },
  AGENT: {
    level: 'AGENT',
    label: 'Agent Detail',
    description: 'Certifications, I/O schema, cross-stack reuse',
    visibleNodeTypes: ['variant', 'certification', 'deployment', 'risk', 'marketplace'],
    layoutStrategy: 'dagre-TB',
    maxVisibleNodes: 50,
    nodeDimensions: { width: 220, height: 90 },
  },
};

// ---------------------------------------------------------------------------
// Mode × Altitude compatibility
// ---------------------------------------------------------------------------

export const ALTITUDE_MODE_MATRIX: Record<AltitudeLevel, ViewMode[]> = {
  GLOBAL: ['strategy', 'governance', 'marketplace', 'simulation'],
  INDUSTRY: ['strategy', 'governance', 'marketplace', 'simulation', 'performance'],
  USE_CASE: ['strategy', 'governance', 'architecture', 'performance', 'simulation'],
  STACK: ['architecture', 'governance', 'performance', 'simulation'],
  AGENT: ['architecture', 'governance', 'performance', 'simulation'],
};

// ---------------------------------------------------------------------------
// Breadcrumb item
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  level: AltitudeLevel;
  label: string;
  context: AltitudeContext;
  /** When true, clicking navigates to GLOBAL with focusedSectorId set */
  isSectorCrumb?: boolean;
  sectorId?: string;
}
