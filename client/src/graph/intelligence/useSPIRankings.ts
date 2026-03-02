import { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { aggregateIndustryClusters } from '../altitude/aggregators';
import { rankIndustries, DEFAULT_SPI_WEIGHTS } from './spiEngine';
import type { SPIResult, SPIWeights } from './spiEngine';
import { getMacroSector } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';

// ---------------------------------------------------------------------------
// Return Type
// ---------------------------------------------------------------------------

export interface SPIRankingsResult {
  /** Top 5 SPI industries across all sectors */
  globalTop5: SPIResult[];
  /** Top 5 SPI industries within the focused sector (empty if no sector focus) */
  sectorTop5: SPIResult[];
  /** Full SPI breakdown for the selected industry (null if not at INDUSTRY altitude) */
  industryDetail: SPIResult | null;
  /** All ranked results (unsliced) for badge counts etc */
  allRanked: SPIResult[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSPIRankings(weights?: SPIWeights): SPIRankingsResult {
  const { industries, useCases, variants } = useAppSelector((s) => s.registry);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);
  const focusedSectorId =
    useAppSelector(
      (s) => (s.graph as unknown as { focusedSectorId?: MacroSectorId | null }).focusedSectorId,
    ) ?? null;
  const currentAltitude = useAppSelector((s) => s.graph.currentAltitude);
  const altitudeContext = useAppSelector((s) => s.graph.altitudeContext);

  return useMemo(() => {
    const clusters = aggregateIndustryClusters(industries, useCases, variants, riskAnalysis ?? []);

    const spiInputs = clusters.map((c) => ({
      industryCode: c.code,
      title: c.title,
      sector: c.sector,
      useCaseCount: c.useCaseCount,
      agentCount: c.agentCount,
      metrics: c.metrics,
    }));

    const effectiveWeights = weights ?? DEFAULT_SPI_WEIGHTS;

    // Global rankings (all industries)
    const allRanked = rankIndustries(spiInputs, effectiveWeights);
    const globalTop5 = allRanked.slice(0, 5);

    // Sector-scoped rankings
    let sectorTop5: SPIResult[] = [];
    if (focusedSectorId) {
      const sectorInputs = spiInputs.filter((i) => {
        const ms = getMacroSector(i.sector);
        return ms.id === focusedSectorId;
      });
      sectorTop5 = rankIndustries(sectorInputs, effectiveWeights, 5);
    }

    // Industry detail (when at INDUSTRY altitude or below)
    let industryDetail: SPIResult | null = null;
    if (currentAltitude !== 'GLOBAL' && altitudeContext.industryCode) {
      industryDetail =
        allRanked.find((r) => r.industryCode === altitudeContext.industryCode) ?? null;
    }

    return { globalTop5, sectorTop5, industryDetail, allRanked };
  }, [
    industries,
    useCases,
    variants,
    riskAnalysis,
    focusedSectorId,
    currentAltitude,
    altitudeContext,
    weights,
  ]);
}
