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
  const prevValueRef = useRef(value);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (prevValueRef.current !== value && prevValueRef.current !== 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  return (
    <button
      onClick={() => onClick(id)}
      className={`flex flex-col items-center px-3 py-0.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
        isPulsing ? 'animate-metric-pulse' : ''
      }`}
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
  const { industries, useCases, skeletons, variants, intelligence } = useAppSelector(
    (s) => s.registry,
  );
  const { marketplace, dashboard } = useAppSelector((s) => s.orchestrator);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);

  const { currentAltitude, altitudeContext } = useAppSelector((s) => s.graph);
  const ontologyRelationships = useAppSelector((s) => s.graph.ontology.relationships);

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

  // Altitude-based filters
  const industryCodeFilter = useMemo((): string | null => {
    if (currentAltitude !== 'GLOBAL' && altitudeContext.industryCode) {
      return altitudeContext.industryCode;
    }
    return null;
  }, [currentAltitude, altitudeContext.industryCode]);

  const useCaseIdFilter = useMemo((): string | null => {
    if (
      (currentAltitude === 'USE_CASE' ||
        currentAltitude === 'STACK' ||
        currentAltitude === 'AGENT') &&
      altitudeContext.useCaseId
    ) {
      return altitudeContext.useCaseId;
    }
    return null;
  }, [currentAltitude, altitudeContext.useCaseId]);

  const skeletonIdFilter = useMemo((): string | null => {
    if (
      (currentAltitude === 'STACK' || currentAltitude === 'AGENT') &&
      altitudeContext.skeletonId
    ) {
      return altitudeContext.skeletonId;
    }
    return null;
  }, [currentAltitude, altitudeContext.skeletonId]);

  const variantIdFilter = useMemo((): string | null => {
    if (currentAltitude === 'AGENT' && altitudeContext.variantId) {
      return altitudeContext.variantId;
    }
    return null;
  }, [currentAltitude, altitudeContext.variantId]);

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

  // Scope use cases: at USE_CASE level and below, filter to just the focused UC
  const scopedUseCases = useMemo(() => {
    if (useCaseIdFilter) {
      return useCases.filter((uc) => uc.id === useCaseIdFilter);
    }
    if (!sectorCodes && !industryCodeFilter) return useCases;
    return useCases.filter((uc) =>
      uc.industryScope?.some((code: string) => scopedIndustryCodes.has(code)),
    );
  }, [useCases, sectorCodes, industryCodeFilter, useCaseIdFilter, scopedIndustryCodes]);

  // Scope variants: progressively narrower at deeper altitudes
  const scopedVariants = useMemo(() => {
    // AGENT level: just the focused variant
    if (variantIdFilter) {
      return variants.filter((v) => v.id === variantIdFilter);
    }
    // STACK level: variants for the focused skeleton
    if (skeletonIdFilter) {
      return variants.filter((v) => v.skeletonId === skeletonIdFilter);
    }
    // USE_CASE level: variants linked via SOLVES ontology
    if (useCaseIdFilter) {
      const linkedSkeletonIds = ontologyRelationships
        .filter(
          (r) =>
            r.relationshipType === 'SOLVES' &&
            (r.subjectId === useCaseIdFilter || r.objectId === useCaseIdFilter),
        )
        .map((r) => (r.subjectId === useCaseIdFilter ? r.objectId : r.subjectId));
      if (linkedSkeletonIds.length > 0) {
        const skIdSet = new Set(linkedSkeletonIds);
        return variants.filter((v) => skIdSet.has(v.skeletonId));
      }
      return variants.filter((v) => v.industryCode && scopedIndustryCodes.has(v.industryCode));
    }
    if (!sectorCodes && !industryCodeFilter) return variants;
    return variants.filter((v) => v.industryCode && scopedIndustryCodes.has(v.industryCode));
  }, [
    variants,
    sectorCodes,
    industryCodeFilter,
    useCaseIdFilter,
    skeletonIdFilter,
    variantIdFilter,
    scopedIndustryCodes,
    ontologyRelationships,
  ]);

  const scopedMarketplace = useMemo(() => {
    const arr = marketplace ?? [];
    if (
      !sectorCodes &&
      !industryCodeFilter &&
      !useCaseIdFilter &&
      !skeletonIdFilter &&
      !variantIdFilter
    )
      return arr;
    const scopedVariantIds = new Set(scopedVariants.map((v) => v.id));
    return arr.filter((m) => m.agentVariantId && scopedVariantIds.has(m.agentVariantId));
  }, [
    marketplace,
    sectorCodes,
    industryCodeFilter,
    useCaseIdFilter,
    skeletonIdFilter,
    variantIdFilter,
    scopedVariants,
  ]);

  // Whether we're at a sub-global altitude (INDUSTRY, USE_CASE, STACK, AGENT)
  const isSubGlobal = !!(
    industryCodeFilter ||
    useCaseIdFilter ||
    skeletonIdFilter ||
    variantIdFilter
  );

  // 1. System Health: at GLOBAL use intelligence scores; deeper = avg cert scores
  const systemHealth = useMemo(() => {
    if (!isSubGlobal) {
      return intelligence && intelligence.length > 0
        ? Math.round(intelligence.reduce((s, i) => s + (i.score ?? 0), 0) / intelligence.length)
        : 0;
    }
    const scores = scopedVariants.map((v) => v.certificationScore ?? 0).filter((s) => s > 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [intelligence, isSubGlobal, scopedVariants]);

  // 2. Risk Concentration: at GLOBAL use riskAnalysis; deeper = inverse of avg cert
  const riskConcentration = useMemo(() => {
    if (!isSubGlobal) {
      return riskAnalysis && riskAnalysis.length > 0
        ? Math.round(riskAnalysis.reduce((s, r) => s + r.riskScore, 0) / riskAnalysis.length)
        : 0;
    }
    const scores = scopedVariants.map((v) => v.certificationScore ?? 0).filter((s) => s > 0);
    if (scores.length > 0) {
      const avgCert = scores.reduce((a, b) => a + b, 0) / scores.length;
      return Math.round(Math.max(0, 100 - avgCert));
    }
    return 50; // unknown = moderate
  }, [riskAnalysis, isSubGlobal, scopedVariants]);

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

  // Build the "Showing:" label — progressively more specific at deeper altitudes
  const showingLabel = useMemo(() => {
    if (variantIdFilter) {
      const v = variants.find((vr) => vr.id === variantIdFilter);
      return v?.name ?? variantIdFilter;
    }
    if (skeletonIdFilter) {
      const sk = skeletons.find((s) => s.id === skeletonIdFilter);
      return sk?.name ?? skeletonIdFilter;
    }
    if (useCaseIdFilter) {
      const uc = useCases.find((u) => u.id === useCaseIdFilter);
      if (uc) {
        return uc.outcomeStatement.length > 40
          ? uc.outcomeStatement.slice(0, 37) + '...'
          : uc.outcomeStatement;
      }
      return useCaseIdFilter;
    }
    if (industryCodeFilter) {
      const ind = industries.find((i) => i.code === industryCodeFilter);
      return ind?.title ?? industryCodeFilter;
    }
    if (focusedSectorId) {
      return MACRO_SECTORS.find((m) => m.id === focusedSectorId)?.label ?? null;
    }
    return null;
  }, [
    variantIdFilter,
    skeletonIdFilter,
    useCaseIdFilter,
    industryCodeFilter,
    focusedSectorId,
    industries,
    useCases,
    skeletons,
    variants,
  ]);

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
