import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveMetricPanel } from '../state/graphSlice';

const METRIC_TITLES: Record<string, string> = {
  systemHealth: 'System Health Breakdown',
  riskConcentration: 'Risk Concentration Analysis',
  coverageGap: 'Coverage Gap Analysis',
  certStrength: 'Certification Strength',
  marketplaceReadiness: 'Marketplace Readiness',
  activeAgentImpact: 'Active Agent Impact',
  autonomyConfidence: 'Autonomy Confidence',
};

function SystemHealthDetail() {
  const { intelligence } = useAppSelector((s) => s.registry);
  if (!intelligence || intelligence.length === 0) {
    return <EmptyMessage message="No intelligence data available." />;
  }

  return (
    <div className="space-y-2">
      {intelligence.slice(0, 10).map((item, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/3"
        >
          <div>
            <div className="text-[10px] text-[var(--text-primary)]">
              {item.metricType ?? 'metric'}
            </div>
            <div className="text-[8px] text-[var(--text-muted)]">{item.computedBy ?? ''}</div>
          </div>
          <div className="text-[11px] font-bold text-blue-400">{item.score ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

function RiskConcentrationDetail() {
  const { riskAnalysis } = useAppSelector((s) => s.compliance);
  const sorted = [...(riskAnalysis ?? [])].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8);

  if (sorted.length === 0) {
    return <EmptyMessage message="No risk analysis data available." />;
  }

  return (
    <div className="space-y-2">
      {sorted.map((r, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/3"
        >
          <div>
            <div className="text-[10px] text-[var(--text-primary)]">
              {r.category ?? `Risk ${idx + 1}`}
            </div>
            <div className="text-[8px] text-[var(--text-muted)]">
              {r.severity ?? 'unknown'} severity
            </div>
          </div>
          <div
            className="text-[11px] font-bold"
            style={{
              color: r.riskScore > 70 ? '#ef4444' : r.riskScore > 40 ? '#f59e0b' : '#10b981',
            }}
          >
            {r.riskScore}
          </div>
        </div>
      ))}
    </div>
  );
}

function CoverageGapDetail() {
  const { industries, useCases } = useAppSelector((s) => s.registry);
  const coveredIndustries = new Set(useCases.flatMap((uc) => uc.industryScope ?? []));
  const uncovered = industries.filter((ind) => !coveredIndustries.has(ind.code));

  if (uncovered.length === 0) {
    return (
      <div className="text-[10px] text-green-400 text-center py-4">Full coverage achieved.</div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[9px] text-[var(--text-muted)] mb-2">
        {uncovered.length} industries without use case coverage
      </div>
      {uncovered.slice(0, 12).map((ind) => (
        <div key={ind.code} className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/3">
          <span className="text-[9px] text-amber-400 font-mono">{ind.code}</span>
          <span className="text-[10px] text-[var(--text-primary)] truncate">{ind.title}</span>
        </div>
      ))}
      {uncovered.length > 12 && (
        <div className="text-[8px] text-[var(--text-muted)] text-center">
          +{uncovered.length - 12} more
        </div>
      )}
    </div>
  );
}

function CertStrengthDetail() {
  const { variants } = useAppSelector((s) => s.registry);
  const statusCounts: Record<string, number> = {};
  for (const v of variants) {
    const status = v.certificationStatus ?? 'unknown';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  const statusColors: Record<string, string> = {
    certified: '#10b981',
    pending: '#f59e0b',
    expired: '#ef4444',
    revoked: '#dc2626',
    unknown: '#6b7280',
  };

  return (
    <div className="space-y-2">
      <div className="text-[9px] text-[var(--text-muted)] mb-2">
        {variants.length} total variants
      </div>
      {Object.entries(statusCounts).map(([status, count]) => (
        <div
          key={status}
          className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/3"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColors[status] ?? '#6b7280' }}
            />
            <span className="text-[10px] text-[var(--text-primary)] capitalize">{status}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold"
              style={{ color: statusColors[status] ?? '#6b7280' }}
            >
              {count}
            </span>
            <span className="text-[8px] text-[var(--text-muted)]">
              ({variants.length > 0 ? Math.round((count / variants.length) * 100) : 0}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketplaceReadinessDetail() {
  const { marketplace } = useAppSelector((s) => s.orchestrator);
  const arr = marketplace ?? [];
  const statusCounts: Record<string, number> = {};
  for (const m of arr) {
    const status = m.status ?? 'unknown';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  return (
    <div className="space-y-2">
      <div className="text-[9px] text-[var(--text-muted)] mb-2">
        {arr.length} marketplace submissions
      </div>
      {Object.entries(statusCounts).map(([status, count]) => (
        <div
          key={status}
          className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/3"
        >
          <span className="text-[10px] text-[var(--text-primary)] capitalize">{status}</span>
          <span className="text-[10px] font-bold text-pink-400">{count}</span>
        </div>
      ))}
    </div>
  );
}

function ActiveAgentImpactDetail() {
  const { variants, skeletons } = useAppSelector((s) => s.registry);
  const deployed = variants
    .filter((v) => v.deployments && v.deployments.length > 0)
    .sort((a, b) => (b.deployments?.length ?? 0) - (a.deployments?.length ?? 0))
    .slice(0, 10);

  if (deployed.length === 0) {
    return <EmptyMessage message="No deployed agents found." />;
  }

  return (
    <div className="space-y-2">
      {deployed.map((v) => {
        const skeleton = skeletons.find((sk) => sk.id === v.skeletonId);
        return (
          <div
            key={v.id}
            className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/3"
          >
            <div>
              <div className="text-[10px] text-[var(--text-primary)]">{v.name ?? v.id}</div>
              <div className="text-[8px] text-[var(--text-muted)]">{skeleton?.name ?? ''}</div>
            </div>
            <div className="text-[10px] font-bold text-purple-400">
              {v.deployments?.length ?? 0} deploys
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AutonomyConfidenceDetail() {
  const { dashboard } = useAppSelector((s) => s.orchestrator);
  if (!dashboard) {
    return <EmptyMessage message="Orchestrator dashboard not loaded." />;
  }

  const items = [
    {
      label: 'System Confidence',
      value: `${Math.round((dashboard.systemConfidence ?? 0) * 100)}%`,
    },
    { label: 'Active Intents', value: dashboard.activeIntents ?? 0 },
    { label: 'Pending Approvals', value: dashboard.pendingApprovals ?? 0 },
    { label: 'Completed Today', value: dashboard.completedToday ?? 0 },
    { label: 'Guardrail Violations', value: dashboard.guardrailViolations ?? 0 },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/3"
        >
          <span className="text-[10px] text-[var(--text-muted)]">{item.label}</span>
          <span className="text-[10px] font-bold text-indigo-400">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return <div className="text-[10px] text-[var(--text-muted)] text-center py-6">{message}</div>;
}

function MetricContent({ metricId }: { metricId: string }) {
  switch (metricId) {
    case 'systemHealth':
      return <SystemHealthDetail />;
    case 'riskConcentration':
      return <RiskConcentrationDetail />;
    case 'coverageGap':
      return <CoverageGapDetail />;
    case 'certStrength':
      return <CertStrengthDetail />;
    case 'marketplaceReadiness':
      return <MarketplaceReadinessDetail />;
    case 'activeAgentImpact':
      return <ActiveAgentImpactDetail />;
    case 'autonomyConfidence':
      return <AutonomyConfidenceDetail />;
    default:
      return <EmptyMessage message="Unknown metric." />;
  }
}

/**
 * Right-side slide-in panel showing details for a clicked executive metric.
 */
export function MetricDetailPanel() {
  const dispatch = useAppDispatch();
  const activeMetricPanel =
    useAppSelector(
      (s) => (s.graph as unknown as { activeMetricPanel?: string | null }).activeMetricPanel,
    ) ?? null;

  if (!activeMetricPanel) return null;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[380px] z-40 animate-slide-in">
      <div className="h-full bg-[var(--surface-primary)]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">
            {METRIC_TITLES[activeMetricPanel] ?? activeMetricPanel}
          </h3>
          <button
            onClick={() => dispatch(setActiveMetricPanel(null))}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-white/5 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 2L10 10M10 2L2 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <MetricContent metricId={activeMetricPanel} />
        </div>
      </div>
    </div>
  );
}
