import { clamp } from '../utils/performanceUtils';
import type { ClusterMetrics } from '../altitude/altitudeTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SPIWeights {
  coverageGap: number;
  riskExposure: number;
  revenueProxy: number;
  certWeakness: number;
  volatility: number;
  agentSaturation: number;
}

export interface SPIInput {
  industryCode: string;
  title: string;
  sector: string;
  useCaseCount: number;
  agentCount: number;
  metrics: ClusterMetrics;
}

export interface SPIBreakdown {
  coverageGapScore: number; // 0-100  higher = more gap
  certWeaknessScore: number; // 0-100  higher = weaker certs
  riskExposureScore: number; // 0-100  direct from riskIndex
  revenueProxyScore: number; // 0-100  normalized agentCount
  volatilityScore: number; // 0-100  direct from metrics
  agentSaturationScore: number; // 0-100  inverse (high = low saturation = opportunity)
}

export interface SPIResult {
  industryCode: string;
  title: string;
  sector: string;
  spiScore: number; // 0-100 weighted sum
  rank: number; // 1-based
  breakdown: SPIBreakdown;
  recommendedAction: string;
}

// ---------------------------------------------------------------------------
// Default Weights (sum = 1.0)
// ---------------------------------------------------------------------------

export const DEFAULT_SPI_WEIGHTS: SPIWeights = {
  coverageGap: 0.25,
  riskExposure: 0.2,
  revenueProxy: 0.2,
  certWeakness: 0.15,
  volatility: 0.1,
  agentSaturation: 0.1,
};

// ---------------------------------------------------------------------------
// Sub-score Computation
// ---------------------------------------------------------------------------

export function computeSPIBreakdown(input: SPIInput, maxAgentCount: number): SPIBreakdown {
  const safeMax = maxAgentCount > 0 ? maxAgentCount : 1;
  const normalizedAgents = clamp((input.agentCount / safeMax) * 100, 0, 100);

  return {
    coverageGapScore: clamp(100 - input.metrics.coveragePercent, 0, 100),
    certWeaknessScore: clamp(100 - input.metrics.certHealthPercent, 0, 100),
    riskExposureScore: clamp(input.metrics.riskIndex, 0, 100),
    revenueProxyScore: clamp(normalizedAgents, 0, 100),
    volatilityScore: clamp(input.metrics.volatilityScore, 0, 100),
    agentSaturationScore: clamp(100 - normalizedAgents, 0, 100),
  };
}

// ---------------------------------------------------------------------------
// Weighted SPI Score
// ---------------------------------------------------------------------------

export function computeSPI(breakdown: SPIBreakdown, weights: SPIWeights): number {
  const score =
    breakdown.coverageGapScore * weights.coverageGap +
    breakdown.riskExposureScore * weights.riskExposure +
    breakdown.revenueProxyScore * weights.revenueProxy +
    breakdown.certWeaknessScore * weights.certWeakness +
    breakdown.volatilityScore * weights.volatility +
    breakdown.agentSaturationScore * weights.agentSaturation;

  return clamp(Math.round(score * 100) / 100, 0, 100);
}

// ---------------------------------------------------------------------------
// Recommended Action Derivation
// ---------------------------------------------------------------------------

const ACTION_MAP: Record<keyof SPIBreakdown, string> = {
  coverageGapScore: 'Generate new use cases to close deployment coverage gaps in this sector.',
  certWeaknessScore: 'Prioritize certification mapping and governance compliance.',
  riskExposureScore: 'Initiate risk mitigation and guardrail enforcement review.',
  revenueProxyScore: 'Expand marketplace submissions to capitalize on agent density.',
  volatilityScore: 'Stabilize certification drift through recertification scheduling.',
  agentSaturationScore: 'Deploy additional agent variants to fill low-saturation gaps.',
};

export function deriveRecommendedAction(breakdown: SPIBreakdown): string {
  let maxKey: keyof SPIBreakdown = 'coverageGapScore';
  let maxVal = -1;

  for (const key of Object.keys(breakdown) as (keyof SPIBreakdown)[]) {
    if (breakdown[key] > maxVal) {
      maxVal = breakdown[key];
      maxKey = key;
    }
  }

  return ACTION_MAP[maxKey];
}

// ---------------------------------------------------------------------------
// Ranking Engine
// ---------------------------------------------------------------------------

export function rankIndustries(
  inputs: SPIInput[],
  weights: SPIWeights = DEFAULT_SPI_WEIGHTS,
  topN?: number,
): SPIResult[] {
  if (inputs.length === 0) return [];

  const maxAgentCount = Math.max(...inputs.map((i) => i.agentCount), 1);

  const scored = inputs.map((input) => {
    const breakdown = computeSPIBreakdown(input, maxAgentCount);
    const spiScore = computeSPI(breakdown, weights);
    const recommendedAction = deriveRecommendedAction(breakdown);

    return {
      industryCode: input.industryCode,
      title: input.title,
      sector: input.sector,
      spiScore,
      rank: 0,
      breakdown,
      recommendedAction,
    };
  });

  scored.sort((a, b) => b.spiScore - a.spiScore);

  for (let i = 0; i < scored.length; i++) {
    scored[i].rank = i + 1;
  }

  return topN !== undefined ? scored.slice(0, topN) : scored;
}
