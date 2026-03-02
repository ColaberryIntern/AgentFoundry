import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveMetricPanel } from '../state/graphSlice';

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

  // 1. System Health: average intelligence score
  const systemHealth =
    intelligence && intelligence.length > 0
      ? Math.round(intelligence.reduce((s, i) => s + (i.score ?? 0), 0) / intelligence.length)
      : 0;

  // 2. Risk Concentration: weighted avg of high/critical risks
  const riskConcentration =
    riskAnalysis && riskAnalysis.length > 0
      ? Math.round(riskAnalysis.reduce((s, r) => s + r.riskScore, 0) / riskAnalysis.length)
      : 0;

  // 3. Coverage Gap: industries without deployments (approximated by use case coverage)
  const industriesWithUC = new Set(useCases.flatMap((uc) => uc.industryScope ?? []));
  const coverageGap =
    industries.length > 0
      ? Math.round(((industries.length - industriesWithUC.size) / industries.length) * 100)
      : 0;

  // 4. Cert Strength: certified variants / total variants
  const certifiedCount = variants.filter((v) => v.certificationStatus === 'certified').length;
  const certStrength =
    variants.length > 0 ? Math.round((certifiedCount / variants.length) * 100) : 0;

  // 5. Marketplace Readiness: approved+published / total marketplace
  const marketplaceArr = marketplace ?? [];
  const readyCount = marketplaceArr.filter(
    (m) => m.status === 'approved' || m.status === 'published',
  ).length;
  const marketplaceReadiness =
    marketplaceArr.length > 0 ? Math.round((readyCount / marketplaceArr.length) * 100) : 0;

  // 6. Active Agent Impact: count of deployed variants
  const activeAgentCount = variants.filter((v) => v.deployments && v.deployments.length > 0).length;

  // 7. Autonomy Confidence: from orchestrator dashboard
  const autonomyConfidence = dashboard ? Math.round((dashboard.systemConfidence ?? 0) * 100) : 0;

  const metrics: MetricDef[] = [
    { id: 'systemHealth', label: 'System Health', value: systemHealth, color: '#3b82f6' },
    { id: 'riskConcentration', label: 'Risk Conc.', value: riskConcentration, color: '#ef4444' },
    { id: 'coverageGap', label: 'Coverage Gap', value: coverageGap, suffix: '%', color: '#f59e0b' },
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
    { id: 'activeAgentImpact', label: 'Active Agents', value: activeAgentCount, color: '#a855f7' },
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

  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-0.5 px-3 py-1.5 rounded-xl bg-[var(--surface-primary)]/80 backdrop-blur-md border border-white/5 shadow-lg">
        {metrics.map((m) => (
          <AnimatedMetric key={m.id} {...m} onClick={handleMetricClick} />
        ))}
      </div>
    </div>
  );
}
