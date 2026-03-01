import { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';

/**
 * Blast radius visualization: shows the impact scope of pending approvals.
 * Renders a concentric ring layout showing affected entity types and counts.
 */
export function BlastRadiusViz() {
  const { industries, useCases, variants, skeletons } = useAppSelector((s) => s.registry);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);
  const intents = useAppSelector((s) => s.orchestrator.intents);

  const pendingIntents = intents.filter((i) => i.status === 'proposed');

  const impactSummary = useMemo(() => {
    const totalEntities = industries.length + useCases.length + variants.length + skeletons.length;
    const certifiedVariants = variants.filter((v) => v.certificationStatus === 'certified').length;
    const highRiskCount = (riskAnalysis ?? []).filter(
      (r) => r.severity === 'critical' || r.severity === 'high',
    ).length;

    // Estimate blast radius based on pending intents
    const estimatedImpact = Math.min(pendingIntents.length * 3, totalEntities);
    const riskDelta = pendingIntents.length > 0 ? Math.min(pendingIntents.length, 5) : 0;

    return {
      totalEntities,
      certifiedVariants,
      highRiskCount,
      estimatedImpact,
      riskDelta,
      pendingCount: pendingIntents.length,
    };
  }, [industries, useCases, variants, skeletons, riskAnalysis, pendingIntents]);

  const rings = [
    { label: 'Direct', count: impactSummary.pendingCount, color: '#ef4444', radius: 40 },
    { label: 'Dependent', count: impactSummary.estimatedImpact, color: '#f59e0b', radius: 70 },
    { label: 'Ecosystem', count: impactSummary.totalEntities, color: '#3b82f6', radius: 100 },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Impact Ring SVG */}
      <div className="flex justify-center py-4">
        <svg width="240" height="240" viewBox="-120 -120 240 240">
          {rings.map((ring, i) => (
            <g key={i}>
              <circle
                cx={0}
                cy={0}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={1}
                strokeDasharray="4 2"
                opacity={0.3}
              />
              <circle cx={0} cy={0} r={ring.radius} fill={ring.color} opacity={0.05} />
              <text
                x={ring.radius - 5}
                y={-5}
                fill={ring.color}
                fontSize={8}
                textAnchor="end"
                opacity={0.7}
              >
                {ring.label}
              </text>
              <text
                x={ring.radius - 5}
                y={7}
                fill={ring.color}
                fontSize={10}
                textAnchor="end"
                fontWeight="bold"
              >
                {ring.count}
              </text>
            </g>
          ))}
          {/* Center impact dot */}
          <circle cx={0} cy={0} r={8} fill="#ef4444" opacity={0.6}>
            <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x={0} y={4} fill="white" fontSize={8} textAnchor="middle" fontWeight="bold">
            {impactSummary.pendingCount}
          </text>
        </svg>
      </div>

      {/* Impact Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
          <div className="text-[10px] text-[var(--text-muted)]">Total Entities</div>
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {impactSummary.totalEntities}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
          <div className="text-[10px] text-[var(--text-muted)]">Certified</div>
          <div className="text-lg font-bold text-emerald-400">
            {impactSummary.certifiedVariants}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
          <div className="text-[10px] text-[var(--text-muted)]">High Risk</div>
          <div className="text-lg font-bold text-red-400">{impactSummary.highRiskCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
          <div className="text-[10px] text-[var(--text-muted)]">Risk Delta</div>
          <div
            className={`text-lg font-bold ${impactSummary.riskDelta > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
          >
            {impactSummary.riskDelta > 0 ? `+${impactSummary.riskDelta}` : '0'}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-[var(--text-muted)] text-center">
        Concentric rings show direct, dependent, and ecosystem-wide impact scope
      </div>
    </div>
  );
}
