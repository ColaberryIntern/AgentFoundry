import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  useAltitudeScopedIntelligence,
  type ScopedIntelligence,
} from '../intelligence/useAltitudeScopedIntelligence';
import { generateChatResponse } from '../intelligence/chatEngine';
import {
  addChatMessage,
  clearChatMessages,
  closeAgentBrain,
  type ChatMessage,
} from '../state/graphSlice';
import {
  approveIntent,
  rejectIntent,
  resolveViolation,
  createManualIntent,
  fetchDashboard,
  addLocalIntent,
  approveLocalIntent,
  rejectLocalIntent,
} from '../../store/orchestratorSlice';
import { fetchUseCases, fetchAgentVariants } from '../../store/registrySlice';
import { fetchOntologyRelationships } from '../state/graphSlice';
import type { SPIResult, SPIBreakdown } from '../intelligence/spiEngine';
import type { OrchestratorIntent, GuardrailViolation } from '../../types/orchestrator';
import type { AgentVariant } from '../../types/compliance';

type BrainTab = 'insights' | 'alerts' | 'opportunities' | 'askAi';

const TAB_CONFIG: { key: BrainTab; label: string }[] = [
  { key: 'insights', label: 'Insights' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'askAi', label: 'Ask AI' },
];

const ALTITUDE_COLORS: Record<string, string> = {
  GLOBAL: '#6366f1',
  INDUSTRY: '#3b82f6',
  USE_CASE: '#f59e0b',
  STACK: '#a855f7',
  AGENT: '#06b6d4',
};

const ALTITUDE_SHORT: Record<string, string> = {
  GLOBAL: 'Global',
  INDUSTRY: 'Industry',
  USE_CASE: 'Use Case',
  STACK: 'Stack',
  AGENT: 'Agent',
};

const TAB_DESCRIPTIONS: Record<BrainTab, string> = {
  insights: 'Strategic analysis. Review priorities and take the recommended action below.',
  alerts: 'Items needing attention. Approve, resolve, or dismiss each item.',
  opportunities: 'Detected opportunities. Approve to execute or dismiss to skip.',
  askAi: '',
};

/** Initial number of cert items shown per group before "Show all" */
const CERT_INITIAL_LIMIT = 5;

/**
 * Redesigned Agent Intelligence panel with 4 tabs, altitude-scoped content, and chat.
 * Resets on altitude change. Theme-aware colors via design tokens.
 * All cards have action buttons wired to Redux thunks.
 */
export function AgentBrainPanel() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<BrainTab>('insights');
  const scoped = useAltitudeScopedIntelligence();
  const chatMessages = useAppSelector((s) => s.graph.chatMessages);
  const allIntents = useAppSelector((s) => s.orchestrator.intents);
  const demoMode =
    useAppSelector((s) => (s.graph as unknown as { demoMode?: boolean }).demoMode) ?? false;

  // Reset panel on altitude change
  useEffect(() => {
    setActiveTab('insights');
    dispatch(clearChatMessages());
  }, [scoped.altitude, dispatch]);

  const altColor = ALTITUDE_COLORS[scoped.altitude] ?? '#6366f1';
  const altLabel = ALTITUDE_SHORT[scoped.altitude] ?? 'Global';

  // Tab counts
  const insightCount = scoped.spiInsights
    ? Array.isArray(scoped.spiInsights)
      ? scoped.spiInsights.length
      : 1
    : 0;
  const alertCount = scoped.riskAlerts.length + scoped.governance.expiringVariants.length;
  const opCount = scoped.suggestions.length + scoped.expansions.length;

  const tabCounts: Record<BrainTab, number> = {
    insights: insightCount,
    alerts: alertCount + scoped.governance.intents.length,
    opportunities: opCount,
    askAi: chatMessages.length,
  };

  // Submit a question programmatically (used by suggested questions + action CTAs)
  const submitQuestion = useCallback(
    (question: string) => {
      const userMsg: ChatMessage = {
        id: `chat-${Date.now()}-u`,
        role: 'user',
        content: question,
        timestamp: Date.now(),
        altitude: scoped.altitude,
      };
      dispatch(addChatMessage(userMsg));

      const response = generateChatResponse(question, scoped.altitude, scoped);
      const assistantMsg: ChatMessage = {
        id: `chat-${Date.now()}-a`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        altitude: scoped.altitude,
      };
      dispatch(addChatMessage(assistantMsg));

      setActiveTab('askAi');
    },
    [scoped, dispatch],
  );

  // Action callbacks wired to Redux thunks — re-fetch registry after approval
  const handleApproveIntent = useCallback(
    (id: string) => {
      if (demoMode) {
        dispatch(approveLocalIntent({ id }));
        return;
      }
      dispatch(approveIntent({ id })).then(() => {
        // Refresh registry + ontology to update graph nodes and KPI strip
        dispatch(fetchUseCases({}));
        dispatch(fetchAgentVariants({}));
        dispatch(fetchOntologyRelationships({ limit: 500 }));
        dispatch(fetchDashboard());
      });
    },
    [dispatch, demoMode],
  );

  const handleDismissIntent = useCallback(
    (id: string) => {
      if (demoMode) {
        dispatch(rejectLocalIntent({ id }));
        return;
      }
      dispatch(rejectIntent({ id, reason: 'Dismissed from Intelligence panel' }));
    },
    [dispatch, demoMode],
  );

  const handleResolveViolation = useCallback(
    (id: string) => {
      dispatch(resolveViolation({ id, reason: 'Resolved from Intelligence panel' }));
    },
    [dispatch],
  );

  const handleRenewVariant = useCallback(
    (variant: AgentVariant) => {
      submitQuestion(`Schedule certification renewal for ${variant.name ?? variant.id}`);
    },
    [submitQuestion],
  );

  // Map SPI breakdown dominant factor to real intent types
  const handleTakeAction = useCallback(
    (result: SPIResult) => {
      const SPI_INTENT_MAP: Record<string, { intentType: string; priority: string }> = {
        coverageGapScore: { intentType: 'gap_coverage', priority: 'high' },
        certWeaknessScore: { intentType: 'certification_renewal', priority: 'high' },
        riskExposureScore: { intentType: 'risk_mitigation', priority: 'critical' },
        revenueProxyScore: { intentType: 'marketplace_submission', priority: 'medium' },
        volatilityScore: { intentType: 'drift_remediation', priority: 'medium' },
        agentSaturationScore: { intentType: 'expansion_opportunity', priority: 'medium' },
      };

      // Find dominant breakdown factor
      let maxKey: keyof SPIBreakdown = 'coverageGapScore';
      let maxVal = -1;
      for (const key of Object.keys(result.breakdown) as (keyof SPIBreakdown)[]) {
        if (result.breakdown[key] > maxVal) {
          maxVal = result.breakdown[key];
          maxKey = key;
        }
      }

      const mapping = SPI_INTENT_MAP[maxKey] ?? { intentType: 'gap_coverage', priority: 'medium' };
      const intentData = {
        intentType: mapping.intentType,
        title: `${result.recommendedAction} — ${result.title}`,
        description: `SPI Score: ${result.spiScore}, Rank: #${result.rank}, Dominant factor: ${BREAKDOWN_LABELS[maxKey]?.label ?? maxKey}`,
        context: {
          industryCode: result.industryCode,
          sector: result.sector,
          spiScore: result.spiScore,
        },
        priority: mapping.priority,
      };
      if (demoMode) {
        dispatch(addLocalIntent(intentData));
      } else {
        dispatch(createManualIntent(intentData));
      }
    },
    [dispatch, demoMode],
  );

  // Create intent from a proactive suggestion
  const handleCreateSuggestion = useCallback(
    (suggestion: ProactiveSuggestion) => {
      const intentData = {
        intentType: suggestion.intentType,
        title: suggestion.label,
        description: suggestion.description,
        context: suggestion.context,
        priority: suggestion.priority,
      };
      if (demoMode) {
        dispatch(addLocalIntent(intentData));
      } else {
        dispatch(createManualIntent(intentData));
      }
    },
    [dispatch, demoMode],
  );

  // Check whether current tab has content to show description
  const showDescription =
    activeTab !== 'askAi' && TAB_DESCRIPTIONS[activeTab] && tabCounts[activeTab] > 0;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[380px] z-50 animate-slide-in">
      <div className="h-full bg-[var(--surface-primary)]/95 backdrop-blur-xl border-l border-[var(--border-subtle)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${altColor}20`, border: `1px solid ${altColor}40` }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <circle cx="7.5" cy="8" r="1.5" fill={altColor} />
                  <circle cx="12.5" cy="8" r="1.5" fill={altColor} />
                  <path
                    d="M7 13c0 0 1.5 2 3 2s3-2 3-2"
                    stroke={altColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Intelligence</h3>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  backgroundColor: `${altColor}15`,
                  border: `1px solid ${altColor}30`,
                  color: altColor,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: altColor }} />
                {altLabel}
              </div>
              <button
                onClick={() => dispatch(closeAgentBrain())}
                className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-card-hover)] transition-colors"
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
          </div>

          {/* Context label */}
          <div className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
            {scoped.contextLabel}
            {scoped.scopeNote && (
              <span className="ml-1 text-amber-500 italic"> — {scoped.scopeNote}</span>
            )}
          </div>

          {/* Tab row */}
          <div className="flex gap-1 mt-2.5">
            {TAB_CONFIG.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-card-hover)] border border-transparent'
                }`}
              >
                {label}
                {tabCounts[key] > 0 && (
                  <span className="min-w-[14px] h-3.5 px-1 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[9px] font-bold flex items-center justify-center">
                    {tabCounts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab description */}
        {showDescription && (
          <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
            <div className="text-[11px] text-[var(--text-secondary)] italic">
              {TAB_DESCRIPTIONS[activeTab]}
            </div>
          </div>
        )}

        {/* Tab content — scrollbar hidden */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3">
          {activeTab === 'insights' && (
            <InsightsTab
              scoped={scoped}
              onTakeAction={handleTakeAction}
              onApproveIntent={handleApproveIntent}
              onDismissIntent={handleDismissIntent}
              onCreateSuggestion={handleCreateSuggestion}
              intents={allIntents}
            />
          )}
          {activeTab === 'alerts' && (
            <AlertsTab
              scoped={scoped}
              onApproveIntent={handleApproveIntent}
              onDismissIntent={handleDismissIntent}
              onResolveViolation={handleResolveViolation}
              onRenewVariant={handleRenewVariant}
            />
          )}
          {activeTab === 'opportunities' && (
            <OpportunitiesTab
              scoped={scoped}
              onApproveIntent={handleApproveIntent}
              onDismissIntent={handleDismissIntent}
              onCreateSuggestion={handleCreateSuggestion}
            />
          )}
          {activeTab === 'askAi' && (
            <AskAITab messages={chatMessages} scoped={scoped} onAskQuestion={submitQuestion} />
          )}
        </div>

        {/* Chat input — always visible */}
        <ChatInput scoped={scoped} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights Tab — SPI Rankings (altitude-aware) + KPI Correlation
// ---------------------------------------------------------------------------

const BREAKDOWN_LABELS: Record<keyof SPIBreakdown, { label: string; color: string }> = {
  coverageGapScore: { label: 'Coverage Gap', color: '#3b82f6' },
  riskExposureScore: { label: 'Risk', color: '#ef4444' },
  revenueProxyScore: { label: 'Revenue', color: '#ec4899' },
  certWeaknessScore: { label: 'Cert Weakness', color: '#f59e0b' },
  volatilityScore: { label: 'Volatility', color: '#a855f7' },
  agentSaturationScore: { label: 'Agent Gap', color: '#06b6d4' },
};

function InsightsTab({
  scoped,
  onTakeAction,
  onApproveIntent,
  onDismissIntent,
  onCreateSuggestion,
  intents,
}: {
  scoped: ScopedIntelligence;
  onTakeAction: (result: SPIResult) => void;
  onApproveIntent: (id: string) => void;
  onDismissIntent: (id: string) => void;
  onCreateSuggestion: (s: ProactiveSuggestion) => void;
  intents: OrchestratorIntent[];
}) {
  const { spiInsights } = scoped;
  const expandItems = useExpandSystemItems(scoped);

  // Build lookup: industryCode → most recent manual_ui intent
  const actionedMap = useMemo(() => {
    const map = new Map<string, OrchestratorIntent>();
    for (const intent of intents) {
      if (intent.sourceSignal === 'manual_ui') {
        const ic = (intent.context as Record<string, unknown>)?.industryCode as string | undefined;
        if (ic && !map.has(ic)) map.set(ic, intent);
      }
    }
    return map;
  }, [intents]);

  // Activity summary for manual intents
  const manualIntents = useMemo(
    () => intents.filter((i) => i.sourceSignal === 'manual_ui'),
    [intents],
  );

  if (!spiInsights) {
    return <EmptyTab message="No SPI data available at this level." />;
  }

  if (!Array.isArray(spiInsights)) {
    const detail = spiInsights;
    const actionedIntent = actionedMap.get(detail.industryCode) ?? null;
    return (
      <IndustryDetailView
        result={detail}
        onTakeAction={onTakeAction}
        actionedIntent={actionedIntent}
        onApproveIntent={onApproveIntent}
        onDismissIntent={onDismissIntent}
      />
    );
  }

  if (spiInsights.length === 0) {
    return <EmptyTab message="No industries loaded for SPI analysis." />;
  }

  return (
    <div className="space-y-3">
      {/* Recent Actions activity strip */}
      {manualIntents.length > 0 && <ActivityStrip intents={manualIntents} />}

      <div className="text-xs font-semibold text-[var(--text-primary)]">
        Strategic Priorities — {scoped.contextLabel}
      </div>
      {spiInsights.map((result) => {
        const actionedIntent = actionedMap.get(result.industryCode) ?? null;
        return (
          <SPICard
            key={result.industryCode}
            result={result}
            onTakeAction={onTakeAction}
            actionedIntent={actionedIntent}
            onApproveIntent={onApproveIntent}
            onDismissIntent={onDismissIntent}
          />
        );
      })}

      <ExpandSystemSection
        items={expandItems}
        onTakeAction={onCreateSuggestion}
        onApproveIntent={onApproveIntent}
        onDismissIntent={onDismissIntent}
      />
    </div>
  );
}

function SPICard({
  result,
  onTakeAction,
  actionedIntent,
  onApproveIntent,
  onDismissIntent,
}: {
  result: SPIResult;
  onTakeAction: (result: SPIResult) => void;
  actionedIntent: OrchestratorIntent | null;
  onApproveIntent: (id: string) => void;
  onDismissIntent: (id: string) => void;
}) {
  // Show action button only if no active intent (or dismissed/cancelled)
  const showAction =
    !actionedIntent ||
    actionedIntent.status === 'rejected' ||
    actionedIntent.status === 'cancelled';

  return (
    <div className="px-3 py-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
          #{result.rank} {result.title}
        </span>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 ml-2">
          {result.spiScore.toFixed(0)}
        </span>
      </div>
      <div className="text-[10px] text-[var(--text-muted)] mb-1.5">NAICS {result.industryCode}</div>

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

      {showAction ? (
        <button
          onClick={() => onTakeAction(result)}
          className="w-full text-left text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
        >
          <span className="font-medium">Action:</span>{' '}
          <span className="italic">{result.recommendedAction}</span>
        </button>
      ) : (
        <InlineIntentStatus
          intent={actionedIntent!}
          onApprove={onApproveIntent}
          onDismiss={onDismissIntent}
        />
      )}
    </div>
  );
}

function IndustryDetailView({
  result,
  onTakeAction,
  actionedIntent,
  onApproveIntent,
  onDismissIntent,
}: {
  result: SPIResult;
  onTakeAction: (result: SPIResult) => void;
  actionedIntent: OrchestratorIntent | null;
  onApproveIntent: (id: string) => void;
  onDismissIntent: (id: string) => void;
}) {
  const dominantKey = useMemo(() => {
    let maxKey: keyof SPIBreakdown = 'coverageGapScore';
    let maxVal = -1;
    for (const key of Object.keys(result.breakdown) as (keyof SPIBreakdown)[]) {
      if (result.breakdown[key] > maxVal) {
        maxVal = result.breakdown[key];
        maxKey = key;
      }
    }
    return maxKey;
  }, [result.breakdown]);

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-[var(--text-primary)]">
        {result.title} — SPI Analysis
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
        <div className="text-[28px] font-bold text-indigo-600 dark:text-indigo-400">
          {result.spiScore.toFixed(0)}
        </div>
        <div>
          <div className="text-[11px] text-[var(--text-muted)]">Strategic Priority Index</div>
          <div className="text-[11px] text-[var(--text-primary)]">
            Global Rank #{result.rank} · NAICS {result.industryCode}
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2">
        {(Object.keys(BREAKDOWN_LABELS) as (keyof SPIBreakdown)[]).map((key) => {
          const { label, color } = BREAKDOWN_LABELS[key];
          const score = result.breakdown[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
                <span className="text-[11px] font-bold" style={{ color }}>
                  {Math.round(score)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-card)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${score}%`, backgroundColor: color, opacity: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI Correlation Section */}
      <KPICorrelation result={result} dominantKey={dominantKey} />

      {/* Actionable recommended action */}
      <ActionButton
        result={result}
        onTakeAction={onTakeAction}
        actionedIntent={actionedIntent}
        onApproveIntent={onApproveIntent}
        onDismissIntent={onDismissIntent}
      />
    </div>
  );
}

function ActionButton({
  result,
  onTakeAction,
  actionedIntent,
  onApproveIntent,
  onDismissIntent,
}: {
  result: SPIResult;
  onTakeAction: (result: SPIResult) => void;
  actionedIntent: OrchestratorIntent | null;
  onApproveIntent: (id: string) => void;
  onDismissIntent: (id: string) => void;
}) {
  const showAction =
    !actionedIntent ||
    actionedIntent.status === 'rejected' ||
    actionedIntent.status === 'cancelled';

  if (!showAction) {
    return (
      <InlineIntentStatus
        intent={actionedIntent!}
        onApprove={onApproveIntent}
        onDismiss={onDismissIntent}
        large
      />
    );
  }

  return (
    <button
      onClick={() => onTakeAction(result)}
      className="w-full px-3 py-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-left group"
    >
      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5 flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
          <path
            d="M1 6h10M7 2l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Take Action
      </div>
      <div className="text-[11px] text-[var(--text-primary)] group-hover:text-emerald-700 dark:group-hover:text-emerald-200 transition-colors">
        {result.recommendedAction}
      </div>
    </button>
  );
}

/** Compact inline status showing the intent that was created, with approve/dismiss controls */
function InlineIntentStatus({
  intent,
  onApprove,
  onDismiss,
  large,
}: {
  intent: OrchestratorIntent;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  large?: boolean;
}) {
  const isProposed = intent.status === 'proposed' || intent.status === 'detected';
  const isCompleted = intent.status === 'completed';
  const isApproved = intent.status === 'approved' || isCompleted;
  const isExecuting = intent.status === 'executing' || intent.status === 'simulating';

  const borderColor = isCompleted
    ? 'border-l-emerald-500'
    : isApproved
      ? 'border-l-emerald-500'
      : isExecuting
        ? 'border-l-blue-500'
        : 'border-l-indigo-500';

  const statusLabel = isCompleted
    ? 'Done'
    : intent.status.charAt(0).toUpperCase() + intent.status.slice(1);
  const statusColor = isApproved
    ? 'text-emerald-600 dark:text-emerald-400'
    : isExecuting
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-indigo-600 dark:text-indigo-400';

  // Describe what was created
  const actionLabel =
    intent.intentType === 'gap_coverage' || intent.intentType === 'risk_mitigation'
      ? 'Use case + agent created'
      : intent.intentType === 'expansion_opportunity'
        ? 'Agent variant created'
        : intent.intentType === 'certification_renewal'
          ? 'Recertification started'
          : 'Action executed';

  return (
    <div
      className={`${large ? 'px-3 py-2.5' : 'px-2.5 py-2'} rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] border-l-2 ${borderColor} mt-1.5`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          className={`flex-shrink-0 ${statusColor}`}
        >
          <path
            d="M2 6l3 3 5-6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={`text-[10px] font-semibold ${statusColor}`}>
          {isCompleted ? 'Completed' : 'Intent Created'}
        </span>
        <span className="text-[9px] text-[var(--text-muted)]">·</span>
        <span className={`text-[10px] font-medium ${statusColor}`}>{statusLabel}</span>
      </div>
      <div className="text-[10px] text-[var(--text-muted)] mb-1">
        {intent.intentType.replace(/_/g, ' ')} · {intent.priority} priority
      </div>

      {isProposed && (
        <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => onApprove(intent.id)}
            className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/25 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onDismiss(intent.id)}
            className="px-2.5 py-1 rounded-md bg-[var(--surface-card-hover)] text-[var(--text-muted)] text-[10px] font-medium hover:bg-[var(--surface-tertiary)] transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          {actionLabel}
        </div>
      )}

      {isApproved && !isCompleted && (
        <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          Queued for execution
        </div>
      )}
    </div>
  );
}

/** Activity strip showing summary of manually created intents */
function ActivityStrip({ intents }: { intents: OrchestratorIntent[] }) {
  const proposed = intents.filter((i) => i.status === 'proposed' || i.status === 'detected').length;
  const approved = intents.filter(
    (i) => i.status === 'approved' || i.status === 'completed' || i.status === 'executing',
  ).length;
  const dismissed = intents.filter(
    (i) => i.status === 'rejected' || i.status === 'cancelled',
  ).length;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[11px]">
      <span className="font-medium text-indigo-600 dark:text-indigo-400">
        {intents.length} action{intents.length !== 1 ? 's' : ''} taken
      </span>
      {proposed > 0 && <span className="text-[var(--text-muted)]">{proposed} pending</span>}
      {approved > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400">{approved} approved</span>
      )}
      {dismissed > 0 && (
        <span className="text-[var(--text-muted)] opacity-60">{dismissed} dismissed</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI ↔ SPI Correlation Component
// ---------------------------------------------------------------------------

const KPI_SPI_MAP: {
  spiKey: keyof SPIBreakdown;
  kpiLabel: string;
  relationship: string;
}[] = [
  {
    spiKey: 'coverageGapScore',
    kpiLabel: 'Coverage Gap',
    relationship: 'Same metric — higher SPI score means more uncovered areas',
  },
  {
    spiKey: 'certWeaknessScore',
    kpiLabel: 'Cert Strength',
    relationship: 'Inversely related — high weakness = low strength',
  },
  {
    spiKey: 'riskExposureScore',
    kpiLabel: 'Risk Conc.',
    relationship: 'Same underlying risk data',
  },
  {
    spiKey: 'revenueProxyScore',
    kpiLabel: 'Active Agents',
    relationship: 'Normalized agent density vs. raw count',
  },
];

function KPICorrelation({
  result,
  dominantKey,
}: {
  result: SPIResult;
  dominantKey: keyof SPIBreakdown;
}) {
  const { variants, intelligence } = useAppSelector((s) => s.registry);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);
  const { currentAltitude, altitudeContext } = useAppSelector((s) => s.graph);

  const kpiValues = useMemo(() => {
    const scopedVars = altitudeContext.industryCode
      ? variants.filter((v) => v.industryCode === altitudeContext.industryCode)
      : variants;

    const coverageGap = 0;
    const certCount = scopedVars.filter((v) => v.certificationStatus === 'certified').length;
    const certStrength =
      scopedVars.length > 0 ? Math.round((certCount / scopedVars.length) * 100) : 0;
    const riskConc =
      riskAnalysis && riskAnalysis.length > 0
        ? Math.round(riskAnalysis.reduce((s, r) => s + r.riskScore, 0) / riskAnalysis.length)
        : 0;
    const activeAgents = scopedVars.filter((v) => v.deployments && v.deployments.length > 0).length;
    const systemHealth =
      intelligence && intelligence.length > 0
        ? Math.round(intelligence.reduce((s, i) => s + (i.score ?? 0), 0) / intelligence.length)
        : 0;

    return { coverageGap, certStrength, riskConc, activeAgents, systemHealth };
  }, [variants, riskAnalysis, intelligence, altitudeContext.industryCode, currentAltitude]);

  const kpiValueMap: Record<string, string> = {
    'Coverage Gap': `${kpiValues.coverageGap}%`,
    'Cert Strength': `${kpiValues.certStrength}%`,
    'Risk Conc.': `${kpiValues.riskConc}`,
    'Active Agents': `${kpiValues.activeAgents}`,
  };

  const dominantLabel = BREAKDOWN_LABELS[dominantKey]?.label ?? 'Coverage Gap';
  const dominantScore = Math.round(result.breakdown[dominantKey]);

  return (
    <div className="px-3 py-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
      <div className="text-[11px] font-semibold text-[var(--text-primary)] mb-2">
        How This Relates to Your KPIs
      </div>

      <div className="text-[11px] text-[var(--text-muted)] mb-2.5 leading-relaxed">
        An SPI of{' '}
        <span className="font-bold text-indigo-600 dark:text-indigo-400">
          {result.spiScore.toFixed(0)}
        </span>{' '}
        means{' '}
        {result.spiScore >= 70
          ? 'high strategic priority'
          : result.spiScore >= 40
            ? 'moderate strategic priority'
            : 'lower strategic priority'}
        . The largest factor is{' '}
        <span className="font-medium text-[var(--text-primary)]">
          {dominantLabel} ({dominantScore}/100)
        </span>
        .
      </div>

      <div className="space-y-1.5">
        {KPI_SPI_MAP.map(({ spiKey, kpiLabel }) => {
          const spiScore = Math.round(result.breakdown[spiKey]);
          const kpiVal = kpiValueMap[kpiLabel] ?? '—';
          return (
            <div key={spiKey} className="flex items-center gap-2 text-[10px]">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: BREAKDOWN_LABELS[spiKey].color }}
                />
                <span className="text-[var(--text-muted)] truncate">
                  {BREAKDOWN_LABELS[spiKey].label}
                </span>
                <span className="font-bold" style={{ color: BREAKDOWN_LABELS[spiKey].color }}>
                  {spiScore}
                </span>
              </div>
              <svg
                width="10"
                height="8"
                viewBox="0 0 10 8"
                fill="none"
                className="flex-shrink-0 text-[var(--text-muted)] opacity-40"
              >
                <path
                  d="M1 4h8M6 1l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[var(--text-muted)]">{kpiLabel}</span>
                <span className="font-bold text-[var(--text-primary)]">{kpiVal}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[10px] text-[var(--text-muted)] opacity-70">
        Volatility ({Math.round(result.breakdown.volatilityScore)}) and Agent Gap (
        {Math.round(result.breakdown.agentSaturationScore)}) are SPI-only strategic signals.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts Tab — Risk Alerts + Governance merged, with action buttons
// ---------------------------------------------------------------------------

function AlertsTab({
  scoped,
  onApproveIntent,
  onDismissIntent,
  onResolveViolation,
  onRenewVariant,
}: {
  scoped: ScopedIntelligence;
  onApproveIntent: (id: string) => void;
  onDismissIntent: (id: string) => void;
  onResolveViolation: (id: string) => void;
  onRenewVariant: (variant: AgentVariant) => void;
}) {
  const { riskAlerts, governance } = scoped;
  const hasContent =
    riskAlerts.length > 0 ||
    governance.intents.length > 0 ||
    governance.expiringVariants.length > 0;

  if (!hasContent) {
    return <EmptyTab message="No alerts at this level." />;
  }

  return (
    <div className="space-y-4">
      {riskAlerts.length > 0 && (
        <Section title={`Risk Alerts (${riskAlerts.length})`}>
          {riskAlerts.map((v) => (
            <ViolationCard key={v.id} violation={v} onResolve={onResolveViolation} />
          ))}
        </Section>
      )}

      {governance.intents.length > 0 && (
        <Section title={`Governance Intents (${governance.intents.length})`}>
          {governance.intents.map((intent) => (
            <IntentCard
              key={intent.id}
              intent={intent}
              onApprove={onApproveIntent}
              onDismiss={onDismissIntent}
            />
          ))}
        </Section>
      )}

      {governance.expiringVariants.length > 0 && (
        <CertAttentionSection variants={governance.expiringVariants} onRenew={onRenewVariant} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cert Attention — Grouped by status, limited with "Show all"
// ---------------------------------------------------------------------------

function CertAttentionSection({
  variants,
  onRenew,
}: {
  variants: AgentVariant[];
  onRenew: (variant: AgentVariant) => void;
}) {
  const [showAllExpired, setShowAllExpired] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);

  const expired = useMemo(
    () => variants.filter((v) => v.certificationStatus === 'expired'),
    [variants],
  );
  const pending = useMemo(
    () => variants.filter((v) => v.certificationStatus !== 'expired'),
    [variants],
  );

  const visibleExpired = showAllExpired ? expired : expired.slice(0, CERT_INITIAL_LIMIT);
  const visiblePending = showAllPending ? pending : pending.slice(0, CERT_INITIAL_LIMIT);

  return (
    <div>
      <div className="text-[11px] text-[var(--text-muted)] font-medium mb-1.5">
        Cert Attention ({variants.length})
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-3 mb-2 px-3 py-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[11px]">
        {expired.length > 0 && (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {expired.length} expired
          </span>
        )}
        {pending.length > 0 && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {pending.length} pending
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {/* Expired group (shown first — more urgent) */}
        {visibleExpired.map((v) => (
          <VariantCertCard key={v.id} variant={v} onRenew={onRenew} />
        ))}
        {expired.length > CERT_INITIAL_LIMIT && !showAllExpired && (
          <ShowMoreButton
            count={expired.length - CERT_INITIAL_LIMIT}
            onClick={() => setShowAllExpired(true)}
          />
        )}

        {/* Pending group */}
        {visiblePending.map((v) => (
          <VariantCertCard key={v.id} variant={v} onRenew={onRenew} />
        ))}
        {pending.length > CERT_INITIAL_LIMIT && !showAllPending && (
          <ShowMoreButton
            count={pending.length - CERT_INITIAL_LIMIT}
            onClick={() => setShowAllPending(true)}
          />
        )}
      </div>
    </div>
  );
}

function ShowMoreButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:bg-[var(--surface-card-hover)] rounded-md transition-colors"
    >
      Show {count} more...
    </button>
  );
}

// ---------------------------------------------------------------------------
// Expand Your System — suggestions + full lifecycle tracking
// ---------------------------------------------------------------------------

interface ProactiveSuggestion {
  label: string;
  description: string;
  intentType: string;
  priority: string;
  context: Record<string, unknown>;
}

interface ExpandSystemItem {
  type: 'tracking' | 'suggestion';
  intent?: OrchestratorIntent;
  suggestion?: ProactiveSuggestion;
}

function useExpandSystemItems(scoped: ScopedIntelligence): ExpandSystemItem[] {
  const { useCases, industries, variants } = useAppSelector((s) => s.registry);
  const allIntents = useAppSelector((s) => s.orchestrator.intents);

  return useMemo(() => {
    const items: ExpandSystemItem[] = [];

    // Collect manual_ui intents with their industry codes for tracking
    const intentedCodes = new Set<string>();
    const recentIntents: OrchestratorIntent[] = [];
    for (const intent of allIntents) {
      if (intent.sourceSignal === 'manual_ui') {
        const ic = (intent.context as Record<string, unknown>)?.industryCode as string | undefined;
        if (ic) {
          if (
            ['proposed', 'approved', 'executing', 'simulating', 'completed'].includes(intent.status)
          ) {
            intentedCodes.add(ic);
            recentIntents.push(intent);
          }
        }
      }
    }

    // Show recently actioned intents as tracking cards (max 5)
    for (const intent of recentIntents.slice(0, 5)) {
      items.push({ type: 'tracking', intent });
    }

    // Build suggestions for un-actioned industries
    const suggestions: ProactiveSuggestion[] = [];

    if (scoped.altitude === 'GLOBAL' || scoped.altitude === 'INDUSTRY') {
      const coveredCodes = new Set(useCases.flatMap((uc) => uc.industryScope ?? []));
      const uncovered = industries
        .filter((i) => !coveredCodes.has(i.code) && !intentedCodes.has(i.code))
        .slice(0, 2);
      for (const ind of uncovered) {
        suggestions.push({
          label: `Add use case for ${ind.title}`,
          description: `NAICS ${ind.code} has no use case coverage`,
          intentType: 'gap_coverage',
          priority: 'high',
          context: { industryCode: ind.code, sector: ind.sector, spiScore: 75 },
        });
      }

      const variantCodes = new Set(variants.map((v) => v.industryCode).filter(Boolean));
      const noVariant = industries
        .filter(
          (i) =>
            !variantCodes.has(i.code) &&
            !intentedCodes.has(i.code) &&
            !uncovered.some((u) => u.code === i.code),
        )
        .slice(0, 1);
      for (const ind of noVariant) {
        suggestions.push({
          label: `Deploy agent for ${ind.title}`,
          description: `No agent variant exists for NAICS ${ind.code}`,
          intentType: 'expansion_opportunity',
          priority: 'medium',
          context: { industryCode: ind.code, sector: ind.sector },
        });
      }
    }

    if (scoped.altitude === 'USE_CASE' && scoped.altitudeContext.useCaseId) {
      suggestions.push({
        label: 'Expand to more industries',
        description: 'Deploy this use case to additional industry verticals',
        intentType: 'expansion_opportunity',
        priority: 'medium',
        context: { useCaseId: scoped.altitudeContext.useCaseId },
      });
    }

    if (scoped.altitude === 'STACK' && scoped.altitudeContext.skeletonId) {
      suggestions.push({
        label: 'Deploy to production',
        description: 'Deploy this agent stack to a production environment',
        intentType: 'expansion_opportunity',
        priority: 'medium',
        context: { skeletonId: scoped.altitudeContext.skeletonId },
      });
    }

    if (scoped.altitude === 'AGENT' && scoped.altitudeContext.variantId) {
      suggestions.push({
        label: 'Submit to marketplace',
        description: 'Publish this agent for cross-industry adoption',
        intentType: 'marketplace_submission',
        priority: 'medium',
        context: { variantId: scoped.altitudeContext.variantId },
      });
    }

    for (const s of suggestions.slice(0, 3)) {
      items.push({ type: 'suggestion', suggestion: s });
    }

    return items;
  }, [scoped.altitude, scoped.altitudeContext, useCases, industries, variants, allIntents]);
}

function ExpandSystemSection({
  items,
  onTakeAction,
  onApproveIntent,
  onDismissIntent,
}: {
  items: ExpandSystemItem[];
  onTakeAction: (s: ProactiveSuggestion) => void;
  onApproveIntent: (id: string) => void;
  onDismissIntent: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
      <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Expand Your System
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => {
          if (item.type === 'tracking' && item.intent) {
            return (
              <InlineIntentStatus
                key={item.intent.id}
                intent={item.intent}
                onApprove={onApproveIntent}
                onDismiss={onDismissIntent}
              />
            );
          }
          if (item.type === 'suggestion' && item.suggestion) {
            const s = item.suggestion;
            return (
              <button
                key={`suggestion-${i}`}
                onClick={() => onTakeAction(s)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)] transition-colors text-left group"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="text-indigo-500"
                  >
                    <path
                      d="M6 2v8M2 6h8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {s.label}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">
                    {s.description}
                  </div>
                </div>
              </button>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opportunities Tab — Suggestions + Expansion merged, with action buttons
// ---------------------------------------------------------------------------

function OpportunitiesTab({
  scoped,
  onApproveIntent,
  onDismissIntent,
  onCreateSuggestion,
}: {
  scoped: ScopedIntelligence;
  onApproveIntent: (id: string) => void;
  onDismissIntent: (id: string) => void;
  onCreateSuggestion: (s: ProactiveSuggestion) => void;
}) {
  const { suggestions, expansions } = scoped;
  const expandItems = useExpandSystemItems(scoped);
  const hasContent = suggestions.length > 0 || expansions.length > 0 || expandItems.length > 0;

  if (!hasContent) {
    return <EmptyTab message="No opportunities at this level." />;
  }

  return (
    <div className="space-y-4">
      {suggestions.length > 0 && (
        <Section title={`Suggestions (${suggestions.length})`}>
          {suggestions.map((intent) => (
            <IntentCard
              key={intent.id}
              intent={intent}
              onApprove={onApproveIntent}
              onDismiss={onDismissIntent}
            />
          ))}
        </Section>
      )}

      {expansions.length > 0 && (
        <Section title={`Expansion Opportunities (${expansions.length})`}>
          {expansions.map((intent) => (
            <IntentCard
              key={intent.id}
              intent={intent}
              onApprove={onApproveIntent}
              onDismiss={onDismissIntent}
            />
          ))}
        </Section>
      )}

      <ExpandSystemSection
        items={expandItems}
        onTakeAction={onCreateSuggestion}
        onApproveIntent={onApproveIntent}
        onDismissIntent={onDismissIntent}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ask AI Tab — Chat conversation + Smart suggested questions
// ---------------------------------------------------------------------------

function useSuggestedQuestions(scoped: ScopedIntelligence): string[] {
  return useMemo(() => {
    const questions: string[] = [];
    questions.push('Give me a summary of this level');

    if (scoped.riskAlerts.length > 0) {
      questions.push('What risks should I be aware of?');
    }
    if (scoped.suggestions.length > 0) {
      questions.push('What do you recommend I do?');
    }
    if (scoped.governance.expiringVariants.length > 0) {
      questions.push('Which certifications need attention?');
    }
    if (scoped.expansions.length > 0) {
      questions.push('What expansion opportunities exist?');
    }
    if (scoped.spiInsights) {
      questions.push('What are the strategic priorities?');
    }

    questions.push('Explain what I am looking at');
    return questions;
  }, [scoped]);
}

function AskAITab({
  messages,
  scoped,
  onAskQuestion,
}: {
  messages: ChatMessage[];
  scoped: ScopedIntelligence;
  onAskQuestion: (q: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestedQuestions = useSuggestedQuestions(scoped);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col px-1">
        <div className="flex items-center gap-2.5 mb-4 mt-1">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="7.5" cy="8" r="1.5" fill="#6366f1" />
              <circle cx="12.5" cy="8" r="1.5" fill="#6366f1" />
              <path
                d="M7 13c0 0 1.5 2 3 2s3-2 3-2"
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              Ask about {scoped.contextLabel}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Tap a question or type your own below
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => onAskQuestion(q)}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="space-y-3">
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}

      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <div className="text-[10px] text-[var(--text-muted)] mb-1.5">More questions</div>
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions.slice(0, 4).map((q) => (
            <button
              key={q}
              onClick={() => onAskQuestion(q)}
              className="px-2.5 py-1 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/20 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
          isUser
            ? 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border border-indigo-500/20 rounded-br-sm'
            : 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-sm'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className="text-[9px] text-[var(--text-muted)] mt-1 opacity-60">
          {ALTITUDE_SHORT[message.altitude] ?? message.altitude}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat Input — always visible at bottom
// ---------------------------------------------------------------------------

function ChatInput({ scoped }: { scoped: ScopedIntelligence }) {
  const dispatch = useAppDispatch();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = input.trim();
      if (!q) return;

      const userMsg: ChatMessage = {
        id: `chat-${Date.now()}-u`,
        role: 'user',
        content: q,
        timestamp: Date.now(),
        altitude: scoped.altitude,
      };
      dispatch(addChatMessage(userMsg));

      const response = generateChatResponse(q, scoped.altitude, scoped);
      const assistantMsg: ChatMessage = {
        id: `chat-${Date.now()}-a`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        altitude: scoped.altitude,
      };
      dispatch(addChatMessage(assistantMsg));

      setInput('');
    },
    [input, scoped, dispatch],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-shrink-0 px-3 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)]/80"
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${scoped.contextLabel}...`}
          className="flex-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500/40 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 6h10M7 2l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Shared Cards & Helpers (with action buttons + left-border severity)
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--text-muted)] font-medium mb-1.5">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const RESOLVED_STATUSES = new Set(['approved', 'rejected', 'completed', 'cancelled']);
const ACTIONABLE_STATUSES = new Set(['proposed', 'detected']);

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
  completed: { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400' },
  rejected: { bg: 'bg-gray-500/15', text: 'text-gray-500' },
  cancelled: { bg: 'bg-gray-500/15', text: 'text-gray-500' },
};

const PRIORITY_BORDER: Record<string, string> = {
  critical: 'border-l-2 border-l-red-500',
  high: 'border-l-2 border-l-amber-500',
  medium: 'border-l-2 border-l-blue-500',
  low: 'border-l-2 border-l-emerald-500',
};

function IntentCard({
  intent,
  onApprove,
  onDismiss,
}: {
  intent: OrchestratorIntent;
  onApprove?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981',
  };

  const isActionable = ACTIONABLE_STATUSES.has(intent.status);
  const isResolved = RESOLVED_STATUSES.has(intent.status);
  const statusStyle = STATUS_COLORS[intent.status];
  const leftBorder = PRIORITY_BORDER[intent.priority] ?? '';

  return (
    <div
      className={`px-3 py-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] ${leftBorder}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
          {intent.title}
        </span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2"
          style={{
            backgroundColor: `${priorityColors[intent.priority] ?? '#6b7280'}20`,
            color: priorityColors[intent.priority] ?? '#6b7280',
          }}
        >
          {intent.priority}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
        <span className="capitalize">{intent.intentType.replace(/_/g, ' ')}</span>
        <span>·</span>
        <span>{Math.round(intent.confidenceScore * 100)}% confidence</span>
        <span>·</span>
        <span className="capitalize">{intent.status}</span>
      </div>

      {isActionable && (onApprove || onDismiss) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)]">
          {onApprove && (
            <button
              onClick={() => onApprove(intent.id)}
              className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/25 transition-colors"
            >
              Approve
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(intent.id)}
              className="px-2.5 py-1 rounded-md bg-[var(--surface-card-hover)] text-[var(--text-muted)] text-[10px] font-medium hover:bg-[var(--surface-tertiary)] transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {isResolved && statusStyle && (
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {intent.status}
          </span>
        </div>
      )}
    </div>
  );
}

function ViolationCard({
  violation,
  onResolve,
}: {
  violation: GuardrailViolation;
  onResolve?: (id: string) => void;
}) {
  const isBlock = violation.severity === 'block';
  return (
    <div
      className={`px-3 py-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] ${
        isBlock ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-amber-500'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
          {violation.guardrailType.replace(/_/g, ' ')}
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            isBlock
              ? 'bg-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
          }`}
        >
          {violation.severity}
        </span>
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">
        {JSON.stringify(violation.violationDetails).slice(0, 80)}
      </div>

      {onResolve && (
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => onResolve(violation.id)}
            className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/25 transition-colors"
          >
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}

function VariantCertCard({
  variant,
  onRenew,
}: {
  variant: AgentVariant;
  onRenew?: (variant: AgentVariant) => void;
}) {
  const isExpired = variant.certificationStatus === 'expired';
  return (
    <div
      className={`px-3 py-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] ${
        isExpired ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-amber-500'
      }`}
    >
      {/* Line 1: Full name */}
      <div className="text-xs font-medium text-[var(--text-primary)] mb-1 leading-snug">
        {variant.name ?? variant.id}
      </div>
      {/* Line 2: Status dot + label + action button */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isExpired ? 'bg-red-500' : 'bg-amber-500'
            }`}
          />
          <span
            className={
              isExpired ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
            }
          >
            {variant.certificationStatus}
          </span>
        </span>
        {onRenew && (
          <button
            onClick={() => onRenew(variant)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              isExpired
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
            }`}
          >
            Flag Renewal
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-xs text-[var(--text-muted)]">
      {message}
    </div>
  );
}
