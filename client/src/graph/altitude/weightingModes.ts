import { clamp } from '../utils/performanceUtils';
import type { IndustryClusterAgg } from './aggregators';

// ---------------------------------------------------------------------------
// Weighting Mode Definitions
// ---------------------------------------------------------------------------

export type WeightingMode = 'coverage' | 'risk' | 'revenue' | 'volatility' | 'certification';

export interface WeightingConfig {
  id: WeightingMode;
  label: string;
  description: string;
  compute: (cluster: IndustryClusterAgg) => number;
}

const BASE_SIZE = 80;
const MIN_SIZE = 60;
const MAX_SIZE = 220;

export const WEIGHTING_CONFIGS: Record<WeightingMode, WeightingConfig> = {
  coverage: {
    id: 'coverage',
    label: 'Coverage',
    description: 'Sized by use case and stack deployment',
    compute: (c) => clamp(BASE_SIZE + c.useCaseCount * 8 + c.stackCount * 5, MIN_SIZE, MAX_SIZE),
  },
  risk: {
    id: 'risk',
    label: 'Risk',
    description: 'Sized by risk index',
    compute: (c) => clamp(BASE_SIZE + c.metrics.riskIndex * 1.4, MIN_SIZE, MAX_SIZE),
  },
  revenue: {
    id: 'revenue',
    label: 'Revenue',
    description: 'Sized by marketplace maturity',
    compute: (c) => clamp(BASE_SIZE + c.agentCount * 6, MIN_SIZE, MAX_SIZE),
  },
  volatility: {
    id: 'volatility',
    label: 'Volatility',
    description: 'Sized by certification drift',
    compute: (c) => clamp(BASE_SIZE + c.metrics.volatilityScore * 1.4, MIN_SIZE, MAX_SIZE),
  },
  certification: {
    id: 'certification',
    label: 'Certification',
    description: 'Sized by certified agent count',
    compute: (c) => clamp(BASE_SIZE + c.metrics.certifiedCount * 10, MIN_SIZE, MAX_SIZE),
  },
};

/** Compute bubble size for a cluster given the current weighting mode. */
export function computeBubbleSize(cluster: IndustryClusterAgg, mode: WeightingMode): number {
  return WEIGHTING_CONFIGS[mode].compute(cluster);
}
