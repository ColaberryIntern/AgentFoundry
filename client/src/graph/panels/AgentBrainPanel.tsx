import { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useSPIRankings } from '../intelligence/useSPIRankings';
import type { SPIResult, SPIBreakdown } from '../intelligence/spiEngine';
import { getMacroSector } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';

type BrainTab =
  | 'intelligence'
  | 'suggestions'
  | 'riskAlerts'
  | 'expansion'
  | 'governance'
  | 'quickActions';

const TAB_LABELS: Record<BrainTab, string> = {
  intelligence: 'SPI Rankings',
  suggestions: 'Suggestions',
  riskAlerts: 'Risk Alerts',
  expansion: 'Expansion',
  governance: 'Governance',
  quickActions: 'Quick Actions',
};

/**
 * 6-tab slide-in panel for the AI Agent Brain.
 * The Intelligence tab is the default and shows context-reactive SPI rankings.
 */
export function AgentBrainPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<BrainTab>('intelligence');
  const { intents, violations, dashboard } = useAppSelector((s) => s.orchestrator);
  const { globalTop5, sectorTop5, industryDetail, allRanked } = useSPIRankings();

  const suggestionCount = intents.filter(
    (i) => i.status === 'proposed' || i.status === 'detected',
  ).length;
  const alertCount = violations.filter((v) => !v.resolved).length;
  const expansionCount = intents.filter((i) => i.intentType === 'expansion_opportunity').length;
  const governanceCount = intents.filter(
    (i) => i.intentType === 'certification_renewal' || i.intentType === 'drift_remediation',
  ).length;
  const highSpiCount = allRanked.filter((r) => r.spiScore > 70).length;

  const tabCounts: Record<BrainTab, number> = {
    intelligence: highSpiCount,
    suggestions: suggestionCount,
    riskAlerts: alertCount,
    expansion: expansionCount,
    governance: governanceCount,
    quickActions: 0,
  };

  const confidencePercent = dashboard ? Math.round((dashboard.systemConfidence ?? 0) * 100) : 0;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[320px] z-50 animate-slide-in">
      <div className="h-full bg-[var(--surface-primary)]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">
                Agent Intelligence
              </h3>
              <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                Autonomy confidence:{' '}
                <span className="text-indigo-400 font-bold">{confidencePercent}%</span>
              </div>
            </div>
            <button
              onClick={onClose}
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

          {/* Tabs */}
          <div className="flex gap-0.5 mt-3 overflow-x-auto">
            {(Object.keys(TAB_LABELS) as BrainTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1 px-2 py-1 text-[9px] font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-[var(--text-muted)] hover:bg-white/5 border border-transparent'
                }`}
              >
                {TAB_LABELS[tab]}
                {tabCounts[tab] > 0 && (
                  <span className="min-w-[14px] h-3.5 px-1 rounded-full bg-indigo-500/30 text-indigo-300 text-[8px] font-bold flex items-center justify-center">
                    {tabCounts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {activeTab === 'intelligence' && (
            <IntelligenceTab
              globalTop5={globalTop5}
              sectorTop5={sectorTop5}
              industryDetail={industryDetail}
            />
          )}
          {activeTab === 'suggestions' && <SuggestionsTab />}
          {activeTab === 'riskAlerts' && <RiskAlertsTab />}
          {activeTab === 'expansion' && <ExpansionTab />}
          {activeTab === 'governance' && <GovernanceTab />}
          {activeTab === 'quickActions' && <QuickActionsTab />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intelligence Tab — Context-Reactive SPI Rankings
// ---------------------------------------------------------------------------

const BREAKDOWN_LABELS: Record<keyof SPIBreakdown, { label: string; color: string }> = {
  coverageGapScore: { label: 'Coverage Gap', color: '#3b82f6' },
  riskExposureScore: { label: 'Risk', color: '#ef4444' },
  revenueProxyScore: { label: 'Revenue', color: '#ec4899' },
  certWeaknessScore: { label: 'Cert Weakness', color: '#f59e0b' },
  volatilityScore: { label: 'Volatility', color: '#a855f7' },
  agentSaturationScore: { label: 'Agent Gap', color: '#06b6d4' },
};

function IntelligenceTab({
  globalTop5,
  sectorTop5,
  industryDetail,
}: {
  globalTop5: SPIResult[];
  sectorTop5: SPIResult[];
  industryDetail: SPIResult | null;
}) {
  const focusedSectorId =
    useAppSelector(
      (s) => (s.graph as unknown as { focusedSectorId?: MacroSectorId | null }).focusedSectorId,
    ) ?? null;

  // Mode C: Industry Detail
  if (industryDetail) {
    return <IndustryDetailView result={industryDetail} />;
  }

  // Mode B: Sector Top 5
  if (focusedSectorId && sectorTop5.length > 0) {
    const sectorConfig = getMacroSector(focusedSectorId);
    return (
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-[var(--text-primary)]">
          Top Priorities in {sectorConfig.label}
        </div>
        {sectorTop5.map((result) => (
          <SPICard key={result.industryCode} result={result} />
        ))}
      </div>
    );
  }

  // Mode A: Global Top 5
  if (globalTop5.length === 0) {
    return <EmptyTab message="No industries loaded for SPI analysis." />;
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold text-[var(--text-primary)]">
        Global Strategic Priorities
      </div>
      {globalTop5.map((result) => (
        <SPICard key={result.industryCode} result={result} />
      ))}
    </div>
  );
}

function SPICard({ result }: { result: SPIResult }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/3 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-[var(--text-primary)] truncate flex-1">
          #{result.rank} {result.title}
        </span>
        <span className="text-[10px] font-bold text-indigo-400 ml-2">
          {result.spiScore.toFixed(0)}
        </span>
      </div>
      <div className="text-[8px] text-[var(--text-muted)] mb-1.5">NAICS {result.industryCode}</div>

      {/* Mini breakdown bar */}
      <div className="flex gap-0.5 h-1.5 mb-1.5 rounded-full overflow-hidden">
        {(Object.keys(BREAKDOWN_LABELS) as (keyof SPIBreakdown)[]).map((key) => (
          <div
            key={key}
            className="rounded-full"
            style={{
              flex: result.breakdown[key],
              backgroundColor: BREAKDOWN_LABELS[key].color,
              opacity: 0.7,
              minWidth: result.breakdown[key] > 0 ? 2 : 0,
            }}
          />
        ))}
      </div>

      <div className="text-[8px] text-[var(--text-muted)] italic">{result.recommendedAction}</div>
    </div>
  );
}

function IndustryDetailView({ result }: { result: SPIResult }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold text-[var(--text-primary)]">
        {result.title} — SPI Analysis
      </div>

      {/* Large SPI score */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
        <div className="text-[24px] font-bold text-indigo-400">{result.spiScore.toFixed(0)}</div>
        <div>
          <div className="text-[9px] text-[var(--text-muted)]">Strategic Priority Index</div>
          <div className="text-[9px] text-[var(--text-primary)]">
            Global Rank #{result.rank} · NAICS {result.industryCode}
          </div>
        </div>
      </div>

      {/* Sub-score breakdown bars */}
      <div className="space-y-2">
        {(Object.keys(BREAKDOWN_LABELS) as (keyof SPIBreakdown)[]).map((key) => {
          const { label, color } = BREAKDOWN_LABELS[key];
          const score = result.breakdown[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-[var(--text-muted)]">{label}</span>
                <span className="text-[9px] font-bold" style={{ color }}>
                  {Math.round(score)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${score}%`,
                    backgroundColor: color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommended action */}
      <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="text-[9px] font-semibold text-emerald-400 mb-0.5">Recommended Action</div>
        <div className="text-[9px] text-[var(--text-primary)]">{result.recommendedAction}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Existing Tabs (unchanged)
// ---------------------------------------------------------------------------

function SuggestionsTab() {
  const { intents } = useAppSelector((s) => s.orchestrator);
  const suggestions = intents.filter((i) => i.status === 'proposed' || i.status === 'detected');

  if (suggestions.length === 0) {
    return <EmptyTab message="No pending suggestions." />;
  }

  return (
    <div className="space-y-2">
      {suggestions.map((intent) => (
        <IntentCard key={intent.id} intent={intent} />
      ))}
    </div>
  );
}

function RiskAlertsTab() {
  const { violations } = useAppSelector((s) => s.orchestrator);
  const unresolved = violations.filter((v) => !v.resolved);

  if (unresolved.length === 0) {
    return <EmptyTab message="No unresolved risk alerts." />;
  }

  return (
    <div className="space-y-2">
      {unresolved.map((v) => (
        <div key={v.id} className="px-3 py-2 rounded-lg bg-white/3 border border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-[var(--text-primary)] capitalize">
              {v.guardrailType.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                v.severity === 'block'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {v.severity}
            </span>
          </div>
          <div className="text-[9px] text-[var(--text-muted)]">
            {JSON.stringify(v.violationDetails).slice(0, 80)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpansionTab() {
  const { intents } = useAppSelector((s) => s.orchestrator);
  const expansions = intents.filter((i) => i.intentType === 'expansion_opportunity');

  if (expansions.length === 0) {
    return <EmptyTab message="No expansion opportunities detected." />;
  }

  return (
    <div className="space-y-2">
      {expansions.map((intent) => (
        <IntentCard key={intent.id} intent={intent} />
      ))}
    </div>
  );
}

function GovernanceTab() {
  const { intents } = useAppSelector((s) => s.orchestrator);
  const { variants } = useAppSelector((s) => s.registry);

  const governanceIntents = intents.filter(
    (i) => i.intentType === 'certification_renewal' || i.intentType === 'drift_remediation',
  );

  const expiringVariants = variants.filter(
    (v) => v.certificationStatus === 'pending' || v.certificationStatus === 'expired',
  );

  return (
    <div className="space-y-3">
      {governanceIntents.length > 0 && (
        <div>
          <div className="text-[9px] text-[var(--text-muted)] font-medium mb-1.5">
            Governance Intents
          </div>
          <div className="space-y-2">
            {governanceIntents.map((intent) => (
              <IntentCard key={intent.id} intent={intent} />
            ))}
          </div>
        </div>
      )}

      {expiringVariants.length > 0 && (
        <div>
          <div className="text-[9px] text-[var(--text-muted)] font-medium mb-1.5">
            Cert Attention Required ({expiringVariants.length})
          </div>
          <div className="space-y-1.5">
            {expiringVariants.slice(0, 8).map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between px-2 py-1 rounded-md bg-white/3"
              >
                <span className="text-[9px] text-[var(--text-primary)] truncate">
                  {v.name ?? v.id}
                </span>
                <span
                  className={`text-[8px] font-bold ${
                    v.certificationStatus === 'expired' ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {v.certificationStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {governanceIntents.length === 0 && expiringVariants.length === 0 && (
        <EmptyTab message="Governance is clean." />
      )}
    </div>
  );
}

function QuickActionsTab() {
  return (
    <div className="space-y-2">
      <QuickActionButton label="Run Full Scan" icon="scan" color="#6366f1" />
      <QuickActionButton label="View Pending Approvals" icon="approve" color="#f59e0b" />
      <QuickActionButton label="Open Compliance Monitor" icon="compliance" color="#10b981" />
      <QuickActionButton label="Export Intelligence Report" icon="export" color="#3b82f6" />
      <QuickActionButton label="Refresh All Data" icon="refresh" color="#a855f7" />
    </div>
  );
}

function QuickActionButton({ label, color }: { label: string; icon: string; color: string }) {
  return (
    <button
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors hover:scale-[1.01]"
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}20`,
      }}
    >
      <span
        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
        style={{ backgroundColor: `${color}20`, color }}
      >
        &gt;
      </span>
      <span className="text-[10px] font-medium text-[var(--text-primary)]">{label}</span>
    </button>
  );
}

function IntentCard({
  intent,
}: {
  intent: {
    id: string;
    title: string;
    intentType: string;
    priority: string;
    confidenceScore: number;
    status: string;
  };
}) {
  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981',
  };

  return (
    <div className="px-3 py-2 rounded-lg bg-white/3 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-[var(--text-primary)] truncate flex-1">
          {intent.title}
        </span>
        <span
          className="text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-2"
          style={{
            backgroundColor: `${priorityColors[intent.priority] ?? '#6b7280'}20`,
            color: priorityColors[intent.priority] ?? '#6b7280',
          }}
        >
          {intent.priority}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[8px] text-[var(--text-muted)]">
        <span className="capitalize">{intent.intentType.replace(/_/g, ' ')}</span>
        <span>·</span>
        <span>{Math.round(intent.confidenceScore * 100)}% confidence</span>
        <span>·</span>
        <span className="capitalize">{intent.status}</span>
      </div>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-[10px] text-[var(--text-muted)]">
      {message}
    </div>
  );
}
