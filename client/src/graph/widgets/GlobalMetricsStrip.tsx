import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';

interface MetricDef {
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

function AnimatedMetric({ label, value, suffix, color }: MetricDef) {
  const animatedValue = useAnimatedCount(value);

  return (
    <div className="flex flex-col items-center px-3">
      <div className="text-lg font-bold" style={{ color }}>
        {animatedValue}
        {suffix ?? ''}
      </div>
      <div className="text-[9px] text-[var(--text-muted)] whitespace-nowrap">{label}</div>
    </div>
  );
}

export function GlobalMetricsStrip() {
  const { industries, useCases, skeletons, variants } = useAppSelector((s) => s.registry);
  const { marketplace } = useAppSelector((s) => s.orchestrator);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);

  const totalIndustries = industries.length;
  const totalUseCases = useCases.length;
  const totalStacks = skeletons.length;

  const certifiedCount = variants.filter((v) => v.certificationStatus === 'certified').length;
  const certPercent =
    variants.length > 0 ? Math.round((certifiedCount / variants.length) * 100) : 0;

  const avgRisk =
    riskAnalysis && riskAnalysis.length > 0
      ? Math.round(riskAnalysis.reduce((s, r) => s + r.riskScore, 0) / riskAnalysis.length)
      : 0;

  const marketplaceCount = marketplace?.length ?? 0;

  const metrics: MetricDef[] = [
    { label: 'Industries', value: totalIndustries, color: '#3b82f6' },
    { label: 'Use Cases', value: totalUseCases, color: '#f59e0b' },
    { label: 'Stacks', value: totalStacks, color: '#a855f7' },
    { label: 'Certified', value: certPercent, suffix: '%', color: '#10b981' },
    { label: 'Risk Index', value: avgRisk, color: '#ef4444' },
    { label: 'Marketplace', value: marketplaceCount, color: '#ec4899' },
  ];

  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[var(--surface-primary)]/80 backdrop-blur-md border border-white/5 shadow-lg">
        {metrics.map((m) => (
          <AnimatedMetric key={m.label} {...m} />
        ))}
      </div>
    </div>
  );
}
