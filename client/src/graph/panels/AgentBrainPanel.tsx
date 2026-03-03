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

/**
 * Redesigned Agent Intelligence panel with 4 tabs, altitude-scoped content, and chat.
 * Resets on altitude change. Shows smart suggested questions in Ask AI tab.
 */
export function AgentBrainPanel() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<BrainTab>('insights');
  const scoped = useAltitudeScopedIntelligence();
  const chatMessages = useAppSelector((s) => s.graph.chatMessages);

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

  // Submit a question programmatically (used by suggested questions)
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

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[380px] z-50 animate-slide-in">
      <div className="h-full bg-[var(--surface-primary)]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mini avatar icon */}
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
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Intelligence</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Altitude context chip */}
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
          </div>

          {/* Context label */}
          <div className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
            {scoped.contextLabel}
            {scoped.scopeNote && (
              <span className="ml-1 text-amber-400/80 italic"> — {scoped.scopeNote}</span>
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
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-[var(--text-muted)] hover:bg-white/5 border border-transparent'
                }`}
              >
                {label}
                {tabCounts[key] > 0 && (
                  <span className="min-w-[14px] h-3.5 px-1 rounded-full bg-indigo-500/30 text-indigo-300 text-[9px] font-bold flex items-center justify-center">
                    {tabCounts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content — scrollbar hidden */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3">
          {activeTab === 'insights' && <InsightsTab scoped={scoped} />}
          {activeTab === 'alerts' && <AlertsTab scoped={scoped} />}
          {activeTab === 'opportunities' && <OpportunitiesTab scoped={scoped} />}
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
// Insights Tab — SPI Rankings (altitude-aware)
// ---------------------------------------------------------------------------

const BREAKDOWN_LABELS: Record<keyof SPIBreakdown, { label: string; color: string }> = {
  coverageGapScore: { label: 'Coverage Gap', color: '#3b82f6' },
  riskExposureScore: { label: 'Risk', color: '#ef4444' },
  revenueProxyScore: { label: 'Revenue', color: '#ec4899' },
  certWeaknessScore: { label: 'Cert Weakness', color: '#f59e0b' },
  volatilityScore: { label: 'Volatility', color: '#a855f7' },
  agentSaturationScore: { label: 'Agent Gap', color: '#06b6d4' },
};

function InsightsTab({ scoped }: { scoped: ScopedIntelligence }) {
  const { spiInsights, contextLabel } = scoped;

  if (!spiInsights) {
    return <EmptyTab message="No SPI data available at this level." />;
  }

  // Single industry detail
  if (!Array.isArray(spiInsights)) {
    return <IndustryDetailView result={spiInsights} />;
  }

  // Ranked list
  if (spiInsights.length === 0) {
    return <EmptyTab message="No industries loaded for SPI analysis." />;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-[var(--text-primary)]">
        Strategic Priorities — {contextLabel}
      </div>
      {spiInsights.map((result) => (
        <SPICard key={result.industryCode} result={result} />
      ))}
    </div>
  );
}

function SPICard({ result }: { result: SPIResult }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">
          #{result.rank} {result.title}
        </span>
        <span className="text-xs font-bold text-indigo-400 ml-2">{result.spiScore.toFixed(0)}</span>
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

      <div className="text-[10px] text-[var(--text-muted)] italic">{result.recommendedAction}</div>
    </div>
  );
}

function IndustryDetailView({ result }: { result: SPIResult }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-[var(--text-primary)]">
        {result.title} — SPI Analysis
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
        <div className="text-[28px] font-bold text-indigo-400">{result.spiScore.toFixed(0)}</div>
        <div>
          <div className="text-[11px] text-[var(--text-muted)]">Strategic Priority Index</div>
          <div className="text-[11px] text-[var(--text-primary)]">
            Global Rank #{result.rank} · NAICS {result.industryCode}
          </div>
        </div>
      </div>

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

      <div className="px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="text-[11px] font-semibold text-emerald-400 mb-0.5">Recommended Action</div>
        <div className="text-[11px] text-[var(--text-primary)]">{result.recommendedAction}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts Tab — Risk Alerts + Governance merged
// ---------------------------------------------------------------------------

function AlertsTab({ scoped }: { scoped: ScopedIntelligence }) {
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
            <ViolationCard key={v.id} violation={v} />
          ))}
        </Section>
      )}

      {governance.intents.length > 0 && (
        <Section title={`Governance Intents (${governance.intents.length})`}>
          {governance.intents.map((intent) => (
            <IntentCard key={intent.id} intent={intent} />
          ))}
        </Section>
      )}

      {governance.expiringVariants.length > 0 && (
        <Section title={`Cert Attention (${governance.expiringVariants.length})`}>
          {governance.expiringVariants.slice(0, 10).map((v) => (
            <VariantCertCard key={v.id} variant={v} />
          ))}
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Opportunities Tab — Suggestions + Expansion merged
// ---------------------------------------------------------------------------

function OpportunitiesTab({ scoped }: { scoped: ScopedIntelligence }) {
  const { suggestions, expansions } = scoped;
  const hasContent = suggestions.length > 0 || expansions.length > 0;

  if (!hasContent) {
    return <EmptyTab message="No opportunities at this level." />;
  }

  return (
    <div className="space-y-4">
      {suggestions.length > 0 && (
        <Section title={`Suggestions (${suggestions.length})`}>
          {suggestions.map((intent) => (
            <IntentCard key={intent.id} intent={intent} />
          ))}
        </Section>
      )}

      {expansions.length > 0 && (
        <Section title={`Expansion Opportunities (${expansions.length})`}>
          {expansions.map((intent) => (
            <IntentCard key={intent.id} intent={intent} />
          ))}
        </Section>
      )}
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
        {/* Header */}
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

        {/* Suggested questions */}
        <div className="space-y-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => onAskQuestion(q)}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-white/3 border border-white/5 text-xs text-[var(--text-primary)] hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-colors"
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

      {/* Condensed suggestions after messages */}
      <div className="pt-2 border-t border-white/5">
        <div className="text-[10px] text-[var(--text-muted)] mb-1.5">More questions</div>
        <div className="flex flex-wrap gap-1.5">
          {suggestedQuestions.slice(0, 4).map((q) => (
            <button
              key={q}
              onClick={() => onAskQuestion(q)}
              className="px-2.5 py-1 rounded-full bg-white/3 border border-white/5 text-[10px] text-[var(--text-muted)] hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/20 transition-colors"
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
            ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/20 rounded-br-sm'
            : 'bg-white/5 text-[var(--text-primary)] border border-white/5 rounded-bl-sm'
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
      className="flex-shrink-0 px-3 py-2.5 border-t border-white/5 bg-[var(--surface-primary)]/80"
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${scoped.contextLabel}...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500/40 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
// Shared Cards & Helpers
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--text-muted)] font-medium mb-1.5">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function IntentCard({ intent }: { intent: OrchestratorIntent }) {
  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981',
  };

  return (
    <div className="px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
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
    </div>
  );
}

function ViolationCard({ violation }: { violation: GuardrailViolation }) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
          {violation.guardrailType.replace(/_/g, ' ')}
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            violation.severity === 'block'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {violation.severity}
        </span>
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">
        {JSON.stringify(violation.violationDetails).slice(0, 80)}
      </div>
    </div>
  );
}

function VariantCertCard({ variant }: { variant: AgentVariant }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-white/3">
      <span className="text-[11px] text-[var(--text-primary)] truncate">
        {variant.name ?? variant.id}
      </span>
      <span
        className={`text-[10px] font-bold ${
          variant.certificationStatus === 'expired' ? 'text-red-400' : 'text-amber-400'
        }`}
      >
        {variant.certificationStatus}
      </span>
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
