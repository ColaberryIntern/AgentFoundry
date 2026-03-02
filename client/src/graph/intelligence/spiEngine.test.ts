import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SPI_WEIGHTS,
  computeSPIBreakdown,
  computeSPI,
  deriveRecommendedAction,
  rankIndustries,
  type SPIInput,
  type SPIBreakdown,
  type SPIWeights,
} from './spiEngine';
import type { ClusterMetrics } from '../altitude/altitudeTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMetrics(overrides: Partial<ClusterMetrics> = {}): ClusterMetrics {
  return {
    totalCount: 10,
    certifiedCount: 5,
    certHealthPercent: 50,
    riskIndex: 50,
    coveragePercent: 50,
    volatilityScore: 50,
    activeDeployments: 3,
    errorRate: 0.05,
    ...overrides,
  };
}

function makeInput(overrides: Partial<SPIInput> = {}): SPIInput {
  return {
    industryCode: '52',
    title: 'Finance & Insurance',
    sector: '52',
    useCaseCount: 10,
    agentCount: 5,
    metrics: makeMetrics(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('spiEngine', () => {
  describe('DEFAULT_SPI_WEIGHTS', () => {
    it('sums to exactly 1.0', () => {
      const sum = Object.values(DEFAULT_SPI_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('has exactly 6 weights', () => {
      expect(Object.keys(DEFAULT_SPI_WEIGHTS)).toHaveLength(6);
    });
  });

  describe('computeSPIBreakdown', () => {
    it('produces expected sub-scores for known inputs', () => {
      const input = makeInput({
        agentCount: 10,
        metrics: makeMetrics({
          coveragePercent: 70,
          certHealthPercent: 80,
          riskIndex: 40,
          volatilityScore: 25,
        }),
      });

      const breakdown = computeSPIBreakdown(input, 20);

      expect(breakdown.coverageGapScore).toBe(30); // 100 - 70
      expect(breakdown.certWeaknessScore).toBe(20); // 100 - 80
      expect(breakdown.riskExposureScore).toBe(40); // direct
      expect(breakdown.volatilityScore).toBe(25); // direct
      expect(breakdown.revenueProxyScore).toBe(50); // 10/20 * 100
      expect(breakdown.agentSaturationScore).toBe(50); // 100 - 50
    });

    it('clamps all scores to 0-100', () => {
      const input = makeInput({
        metrics: makeMetrics({
          coveragePercent: 120, // over 100
          riskIndex: -10, // under 0
        }),
      });

      const breakdown = computeSPIBreakdown(input, 10);

      expect(breakdown.coverageGapScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.coverageGapScore).toBeLessThanOrEqual(100);
      expect(breakdown.riskExposureScore).toBeGreaterThanOrEqual(0);
    });

    it('handles maxAgentCount = 0 without division by zero', () => {
      const input = makeInput({ agentCount: 0 });
      const breakdown = computeSPIBreakdown(input, 0);

      expect(breakdown.revenueProxyScore).toBe(0);
      expect(breakdown.agentSaturationScore).toBe(100);
    });
  });

  describe('computeSPI', () => {
    it('returns 50 for uniform breakdown (all 50) with equal weights', () => {
      const breakdown: SPIBreakdown = {
        coverageGapScore: 50,
        certWeaknessScore: 50,
        riskExposureScore: 50,
        revenueProxyScore: 50,
        volatilityScore: 50,
        agentSaturationScore: 50,
      };

      const equalWeights: SPIWeights = {
        coverageGap: 1 / 6,
        riskExposure: 1 / 6,
        revenueProxy: 1 / 6,
        certWeakness: 1 / 6,
        volatility: 1 / 6,
        agentSaturation: 1 / 6,
      };

      expect(computeSPI(breakdown, equalWeights)).toBeCloseTo(50, 0);
    });

    it('returns 0 for all-zero breakdown', () => {
      const breakdown: SPIBreakdown = {
        coverageGapScore: 0,
        certWeaknessScore: 0,
        riskExposureScore: 0,
        revenueProxyScore: 0,
        volatilityScore: 0,
        agentSaturationScore: 0,
      };

      expect(computeSPI(breakdown, DEFAULT_SPI_WEIGHTS)).toBe(0);
    });

    it('returns 100 for all-100 breakdown', () => {
      const breakdown: SPIBreakdown = {
        coverageGapScore: 100,
        certWeaknessScore: 100,
        riskExposureScore: 100,
        revenueProxyScore: 100,
        volatilityScore: 100,
        agentSaturationScore: 100,
      };

      expect(computeSPI(breakdown, DEFAULT_SPI_WEIGHTS)).toBe(100);
    });
  });

  describe('deriveRecommendedAction', () => {
    it('returns coverage action when coverageGapScore dominates', () => {
      const breakdown: SPIBreakdown = {
        coverageGapScore: 90,
        certWeaknessScore: 10,
        riskExposureScore: 10,
        revenueProxyScore: 10,
        volatilityScore: 10,
        agentSaturationScore: 10,
      };

      expect(deriveRecommendedAction(breakdown)).toContain('coverage gaps');
    });

    it('returns certification action when certWeaknessScore dominates', () => {
      const breakdown: SPIBreakdown = {
        coverageGapScore: 10,
        certWeaknessScore: 90,
        riskExposureScore: 10,
        revenueProxyScore: 10,
        volatilityScore: 10,
        agentSaturationScore: 10,
      };

      expect(deriveRecommendedAction(breakdown)).toContain('certification');
    });

    it('returns risk action when riskExposureScore dominates', () => {
      const breakdown: SPIBreakdown = {
        coverageGapScore: 10,
        certWeaknessScore: 10,
        riskExposureScore: 90,
        revenueProxyScore: 10,
        volatilityScore: 10,
        agentSaturationScore: 10,
      };

      expect(deriveRecommendedAction(breakdown)).toContain('risk mitigation');
    });
  });

  describe('rankIndustries', () => {
    it('returns empty array for empty input', () => {
      expect(rankIndustries([])).toEqual([]);
    });

    it('returns single industry with rank 1', () => {
      const results = rankIndustries([makeInput()]);
      expect(results).toHaveLength(1);
      expect(results[0].rank).toBe(1);
    });

    it('sorts descending by spiScore', () => {
      const inputs: SPIInput[] = [
        makeInput({
          industryCode: 'A',
          title: 'Low SPI',
          metrics: makeMetrics({ coveragePercent: 90, certHealthPercent: 90, riskIndex: 10 }),
        }),
        makeInput({
          industryCode: 'B',
          title: 'High SPI',
          metrics: makeMetrics({ coveragePercent: 10, certHealthPercent: 10, riskIndex: 90 }),
        }),
      ];

      const results = rankIndustries(inputs);

      expect(results[0].industryCode).toBe('B');
      expect(results[1].industryCode).toBe('A');
      expect(results[0].spiScore).toBeGreaterThan(results[1].spiScore);
    });

    it('respects topN limit', () => {
      const inputs = Array.from({ length: 10 }, (_, i) =>
        makeInput({ industryCode: `ind-${i}`, title: `Industry ${i}` }),
      );

      const results = rankIndustries(inputs, DEFAULT_SPI_WEIGHTS, 3);

      expect(results).toHaveLength(3);
    });

    it('assigns sequential ranks', () => {
      const inputs = Array.from({ length: 5 }, (_, i) =>
        makeInput({
          industryCode: `ind-${i}`,
          title: `Industry ${i}`,
          agentCount: (i + 1) * 2,
          metrics: makeMetrics({ riskIndex: (i + 1) * 15 }),
        }),
      );

      const results = rankIndustries(inputs);

      for (let i = 0; i < results.length; i++) {
        expect(results[i].rank).toBe(i + 1);
      }
    });

    it('produces deterministic results on repeated calls', () => {
      const inputs = Array.from({ length: 20 }, (_, i) =>
        makeInput({
          industryCode: `ind-${i}`,
          title: `Industry ${i}`,
          agentCount: Math.floor(i * 1.5),
          metrics: makeMetrics({
            riskIndex: i * 5,
            coveragePercent: 100 - i * 4,
            certHealthPercent: 50 + i * 2,
          }),
        }),
      );

      const run1 = rankIndustries(inputs);
      const run2 = rankIndustries(inputs);

      expect(run1.map((r) => r.industryCode)).toEqual(run2.map((r) => r.industryCode));
      expect(run1.map((r) => r.spiScore)).toEqual(run2.map((r) => r.spiScore));
    });

    it('includes recommendedAction for each result', () => {
      const inputs = [makeInput(), makeInput({ industryCode: '51', title: 'Tech' })];
      const results = rankIndustries(inputs);

      for (const result of results) {
        expect(result.recommendedAction).toBeTruthy();
        expect(typeof result.recommendedAction).toBe('string');
      }
    });
  });
});
