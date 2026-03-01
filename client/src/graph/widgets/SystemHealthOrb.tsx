import { useState, useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { SystemHealthBreakdown } from './SystemHealthBreakdown';
import { scoreToColor } from '../utils/performanceUtils';

/**
 * Animated SVG health orb floating on the graph canvas.
 * Click to expand into a 5-metric radial breakdown.
 */
export function SystemHealthOrb() {
  const [expanded, setExpanded] = useState(false);
  const intelligence = useAppSelector((s) => s.registry.intelligence);
  const { variants } = useAppSelector((s) => s.registry);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);

  const metrics = useMemo(() => {
    // health: average of intelligence metric values
    const intelligenceValues = (intelligence ?? []).map((i) => i.score ?? 0);
    const health =
      intelligenceValues.length > 0
        ? intelligenceValues.reduce((a, b) => a + b, 0) / intelligenceValues.length
        : 75;

    // coverage: percentage of variants that are certified
    const total = variants.length || 1;
    const certified = variants.filter((v) => v.certificationStatus === 'certified').length;
    const coverage = (certified / total) * 100;

    // drift: inverse of certification score variance (higher = less drift = better)
    const scores = variants.map((v) => v.certificationScore ?? 0).filter((s) => s > 0);
    const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
    const variance =
      scores.length > 0 ? scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length : 0;
    const drift = Math.max(0, 100 - Math.sqrt(variance));

    // compliance_exposure: inverse of high-risk count ratio
    const risks = riskAnalysis ?? [];
    const highRisks = risks.filter(
      (r) => r.severity === 'critical' || r.severity === 'high',
    ).length;
    const complianceExposure =
      risks.length > 0 ? Math.max(0, 100 - (highRisks / risks.length) * 100) : 85;

    // expansion_opportunity: uncertified variants as opportunity
    const uncertified = total - certified;
    const expansionOpportunity = Math.min(100, (uncertified / total) * 100 + 20);

    const overall = (health + coverage + drift + complianceExposure + expansionOpportunity) / 5;

    return {
      overall: Math.round(overall),
      health: Math.round(health),
      coverage: Math.round(coverage),
      drift: Math.round(drift),
      complianceExposure: Math.round(complianceExposure),
      expansionOpportunity: Math.round(expansionOpportunity),
    };
  }, [intelligence, variants, riskAnalysis]);

  const color = scoreToColor(metrics.overall);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="absolute top-16 right-4 z-30">
      {/* Orb */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative group"
        title={`System Health: ${metrics.overall}%`}
      >
        <svg width="56" height="56" viewBox="-28 -28 56 56">
          {/* Outer ring */}
          <circle
            cx={0}
            cy={0}
            r={24}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeDasharray={`${(metrics.overall / 100) * 150.8} 150.8`}
            strokeLinecap="round"
            transform="rotate(-90)"
            opacity={0.8}
          />
          {/* Background ring */}
          <circle cx={0} cy={0} r={24} fill="none" stroke={color} strokeWidth={1} opacity={0.15} />
          {/* Inner glow */}
          <circle cx={0} cy={0} r={18} fill={color} opacity={0.1}>
            {!prefersReducedMotion && (
              <animate
                attributeName="opacity"
                values="0.08;0.15;0.08"
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          {/* Core */}
          <circle cx={0} cy={0} r={14} fill={color} opacity={0.15} />
          {/* Score text */}
          <text
            x={0}
            y={1}
            fill={color}
            fontSize={14}
            textAnchor="middle"
            dominantBaseline="middle"
            fontWeight="bold"
          >
            {metrics.overall}
          </text>
        </svg>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          System Health
        </div>
      </button>

      {/* Breakdown popup */}
      {expanded && <SystemHealthBreakdown metrics={metrics} onClose={() => setExpanded(false)} />}
    </div>
  );
}
