import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveMetricPanel } from '../state/graphSlice';
import { MACRO_SECTORS } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';

interface MetricDef {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}

function useAnimatedCount(target: number, duration = 600): number {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  const displayRef = useRef(0);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(target);
      displayRef.current = target;
      return;
    }

    const from = displayRef.current;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (target - from) * eased);
      displayRef.current = value;
      setDisplay(value);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, prefersReducedMotion]);

  return display;
}

function AnimatedMetric({
  id,
  label,
  value,
  suffix,
  color,
  onClick,
}: MetricDef & { onClick: (id: string) => void }) {
  const animatedValue = useAnimatedCount(value);

  return (
    <button
      onClick={() => onClick(id)}
      className="flex flex-col items-center px-3 py-0.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
    >
      <div className="text-lg font-bold" style={{ color }}>
        {animatedValue}
        {suffix ?? ''}
      </div>
      <div className="text-[9px] text-[var(--text-muted)] whitespace-nowrap">{label}</div>
    </button>
  );
}

export function GlobalMetricsStrip() {
  const dispatch = useAppDispatch();
  const { industries, useCases, variants, intelligence } = useAppSelector((s) => s.registry);
  const { marketplace, dashboard } = useAppSelector((s) => s.orchestrator);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);

  const { currentAltitude, altitudeContext } = useAppSelector((s) => s.graph);

  const focusedSectorId =
    useAppSelector(
      (s) => (s.graph as unknown as { focusedSectorId?: MacroSectorId | null }).focusedSectorId,
    ) ?? null;

  // Resolve sector codes for focused sector
  const sectorCodes = useMemo((): Set<string> | null => {
    if (!focusedSectorId) return null;
    const ms = MACRO_SECTORS.find((m) => m.id === focusedSectorId);
    if (!ms) return null;
    return new Set(ms.sectorCodes);
  }, [focusedSectorId]);

  // At INDUSTRY altitude, scope to the focused industry code
  const industryCodeFilter = useMemo((): string | null => {
    if (currentAltitude !== 'GLOBAL' && altitudeContext.industryCode) {
      return altitudeContext.industryCode;
    }
    return null;
  }, [currentAltitude, altitudeContext.industryCode]);

  // Scope data by focused sector or industry
  const scopedIndustries = useMemo(() => {
    if (industryCodeFilter) {
      return industries.filter((ind) => ind.code === industryCodeFilter);
    }
    if (!sectorCodes) return industries;
    return industries.filter((ind) => sectorCodes.has(ind.sector));
  }, [industries, sectorCodes, industryCodeFilter]);

  const scopedIndustryCodes = useMemo(() => {
    return new Set(scopedIndustries.map((i) => i.code));
  }, [scopedIndustries]);

  const scopedUseCases = useMemo(() => {
    if (!sectorCodes && !industryCodeFilter) return useCases;
    return useCases.filter((uc) =>
      uc.industryScope?.some((code: string) => scopedIndustryCodes.has(code)),
    );
  }, [useCases, sectorCodes, industryCodeFilter, scopedIndustryCodes]);

  const scopedVariants = useMemo(() => {
    if (!sectorCodes && !industryCodeFilter) return variants;
    return variants.filter((v) => v.industryCode && scopedIndustryCodes.has(v.industryCode));
  }, [variants, sectorCodes, industryCodeFilter, scopedIndustryCodes]);

  const scopedMarketplace = useMemo(() => {
    const arr = marketplace ?? [];
    if (!sectorCodes && !industryCodeFilter) return arr;
    const scopedVariantIds = new Set(scopedVariants.map((v) => v.id));
    return arr.filter((m) => m.agentVariantId && scopedVariantIds.has(m.agentVariantId));
  }, [marketplace, sectorCodes, industryCodeFilter, scopedVariants]);

  // 1. System Health: average intelligence score (global — not sector-scopeable)
  const systemHealth =
    intelligence && intelligence.length > 0
      ? Math.round(intelligence.reduce((s, i) => s + (i.score ?? 0), 0) / intelligence.length)
      : 0;

  // 2. Risk Concentration: weighted avg of risks (global — not sector-scopeable)
  const riskConcentration =
    riskAnalysis && riskAnalysis.length > 0
      ? Math.round(riskAnalysis.reduce((s, r) => s + r.riskScore, 0) / riskAnalysis.length)
      : 0;

  // 3. Coverage Gap: industries without use case coverage
  const industriesWithUC = new Set(scopedUseCases.flatMap((uc) => uc.industryScope ?? []));
  const coverageGap =
    scopedIndustries.length > 0
      ? Math.round(
          ((scopedIndustries.length - industriesWithUC.size) / scopedIndustries.length) * 100,
        )
      : 0;

  // 4. Cert Strength: certified variants / total variants
  const certifiedCount = scopedVariants.filter((v) => v.certificationStatus === 'certified').length;
  const certStrength =
    scopedVariants.length > 0 ? Math.round((certifiedCount / scopedVariants.length) * 100) : 0;

  // 5. Marketplace Readiness: approved+published / total marketplace
  const readyCount = scopedMarketplace.filter(
    (m) => m.status === 'approved' || m.status === 'published',
  ).length;
  const marketplaceReadiness =
    scopedMarketplace.length > 0 ? Math.round((readyCount / scopedMarketplace.length) * 100) : 0;

  // 6. Active Agent Impact: count of deployed variants
  const activeAgentCount = scopedVariants.filter(
    (v) => v.deployments && v.deployments.length > 0,
  ).length;

  // 7. Autonomy Confidence: from orchestrator dashboard (global)
  const autonomyConfidence = dashboard ? Math.round((dashboard.systemConfidence ?? 0) * 100) : 0;

  const metrics: MetricDef[] = [
    { id: 'useCaseCount', label: 'Use Cases', value: scopedUseCases.length, color: '#f59e0b' },
    { id: 'systemHealth', label: 'System Health', value: systemHealth, color: '#3b82f6' },
    { id: 'riskConcentration', label: 'Risk Conc.', value: riskConcentration, color: '#ef4444' },
    {
      id: 'coverageGap',
      label: 'Coverage Gap',
      value: coverageGap,
      suffix: '%',
      color: '#f59e0b',
    },
    {
      id: 'certStrength',
      label: 'Cert Strength',
      value: certStrength,
      suffix: '%',
      color: '#10b981',
    },
    {
      id: 'marketplaceReadiness',
      label: 'Mkt Ready',
      value: marketplaceReadiness,
      suffix: '%',
      color: '#ec4899',
    },
    {
      id: 'activeAgentImpact',
      label: 'Active Agents',
      value: activeAgentCount,
      color: '#a855f7',
    },
    {
      id: 'autonomyConfidence',
      label: 'Autonomy',
      value: autonomyConfidence,
      suffix: '%',
      color: '#6366f1',
    },
  ];

  const handleMetricClick = (metricId: string) => {
    dispatch(setActiveMetricPanel(metricId));
  };

  // Build the "Showing:" label
  const showingLabel = useMemo(() => {
    if (industryCodeFilter) {
      const ind = industries.find((i) => i.code === industryCodeFilter);
      return ind?.title ?? industryCodeFilter;
    }
    if (focusedSectorId) {
      return MACRO_SECTORS.find((m) => m.id === focusedSectorId)?.label ?? null;
    }
    return null;
  }, [industryCodeFilter, focusedSectorId, industries]);

  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-0.5 px-3 py-1.5 rounded-xl bg-[var(--surface-primary)]/80 backdrop-blur-md border border-white/5 shadow-lg">
        {metrics.map((m) => (
          <AnimatedMetric key={m.id} {...m} onClick={handleMetricClick} />
        ))}
      </div>
      {showingLabel && (
        <div className="text-[8px] text-[var(--text-muted)]/60 text-center mt-0.5">
          Showing: {showingLabel}
        </div>
      )}
    </div>
  );
}
