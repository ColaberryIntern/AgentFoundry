import type { ModeConfig, GraphNodeType, NodeEmphasis, ViewMode } from '../types/graphTypes';

// ---------------------------------------------------------------------------
// Helper to build emphasis maps
// ---------------------------------------------------------------------------

const ALL_NODE_TYPES: GraphNodeType[] = [
  'industry',
  'useCase',
  'skeleton',
  'variant',
  'certification',
  'deployment',
  'risk',
  'marketplace',
];

function makeEmphasis(
  overrides: Partial<Record<GraphNodeType, NodeEmphasis>>,
): Record<GraphNodeType, NodeEmphasis> {
  const base: Record<GraphNodeType, NodeEmphasis> = {} as Record<GraphNodeType, NodeEmphasis>;
  for (const t of ALL_NODE_TYPES) {
    base[t] = overrides[t] ?? 'secondary';
  }
  return base;
}

// ---------------------------------------------------------------------------
// Mode Configurations
// ---------------------------------------------------------------------------

export const STRATEGY_MODE: ModeConfig = {
  id: 'strategy',
  label: 'Strategy',
  description: 'Business value and use case emphasis',
  layoutDirection: 'TB',
  nodeEmphasis: makeEmphasis({
    industry: 'primary',
    useCase: 'primary',
    skeleton: 'secondary',
    variant: 'muted',
    certification: 'muted',
    deployment: 'muted',
    risk: 'secondary',
    marketplace: 'muted',
  }),
};

export const GOVERNANCE_MODE: ModeConfig = {
  id: 'governance',
  label: 'Governance',
  description: 'Audit, compliance, and approval emphasis',
  layoutDirection: 'TB',
  nodeEmphasis: makeEmphasis({
    industry: 'secondary',
    useCase: 'secondary',
    skeleton: 'muted',
    variant: 'secondary',
    certification: 'primary',
    deployment: 'muted',
    risk: 'primary',
    marketplace: 'muted',
  }),
};

export const ARCHITECTURE_MODE: ModeConfig = {
  id: 'architecture',
  label: 'Architecture',
  description: 'Technical dependencies and agent structure',
  layoutDirection: 'LR',
  nodeEmphasis: makeEmphasis({
    industry: 'muted',
    useCase: 'muted',
    skeleton: 'primary',
    variant: 'primary',
    certification: 'secondary',
    deployment: 'primary',
    risk: 'muted',
    marketplace: 'muted',
  }),
};

export const PERFORMANCE_MODE: ModeConfig = {
  id: 'performance',
  label: 'Performance',
  description: 'Health metrics and execution performance',
  layoutDirection: 'TB',
  nodeEmphasis: makeEmphasis({
    industry: 'muted',
    useCase: 'muted',
    skeleton: 'secondary',
    variant: 'secondary',
    certification: 'muted',
    deployment: 'primary',
    risk: 'primary',
    marketplace: 'muted',
  }),
};

export const MARKETPLACE_MODE: ModeConfig = {
  id: 'marketplace',
  label: 'Marketplace',
  description: 'Marketplace constellation and submissions',
  layoutDirection: 'radial',
  nodeEmphasis: makeEmphasis({
    industry: 'primary',
    useCase: 'secondary',
    skeleton: 'muted',
    variant: 'secondary',
    certification: 'primary',
    deployment: 'muted',
    risk: 'muted',
    marketplace: 'primary',
  }),
};

export const SIMULATION_MODE: ModeConfig = {
  id: 'simulation',
  label: 'Simulation',
  description: 'Forked state for what-if analysis',
  layoutDirection: 'TB',
  nodeEmphasis: makeEmphasis({
    industry: 'primary',
    useCase: 'primary',
    skeleton: 'primary',
    variant: 'primary',
    certification: 'primary',
    deployment: 'primary',
    risk: 'primary',
    marketplace: 'primary',
  }),
};

// ---------------------------------------------------------------------------
// Mode Registry
// ---------------------------------------------------------------------------

export const MODE_CONFIGS: Record<ViewMode, ModeConfig> = {
  strategy: STRATEGY_MODE,
  governance: GOVERNANCE_MODE,
  architecture: ARCHITECTURE_MODE,
  performance: PERFORMANCE_MODE,
  marketplace: MARKETPLACE_MODE,
  simulation: SIMULATION_MODE,
};

export function getModeConfig(mode: ViewMode): ModeConfig {
  return MODE_CONFIGS[mode];
}
