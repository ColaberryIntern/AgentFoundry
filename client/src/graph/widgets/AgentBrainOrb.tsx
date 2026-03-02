import { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { AgentBrainPanel } from '../panels/AgentBrainPanel';

/**
 * Persistent AI agent orb (bottom-right). Shows badge counts for
 * recommendations, risk alerts, cert expiring, and expansion opportunities.
 * Click toggles AgentBrainPanel.
 */
export function AgentBrainOrb() {
  const [panelOpen, setPanelOpen] = useState(false);

  const { intents, violations } = useAppSelector((s) => s.orchestrator);
  const { variants } = useAppSelector((s) => s.registry);

  // Count proposed/detected intents (suggestions)
  const suggestionCount = intents.filter(
    (i) => i.status === 'proposed' || i.status === 'detected',
  ).length;

  // Count unresolved violations
  const alertCount = violations.filter((v) => !v.resolved).length;

  // Count expansion opportunities
  const expansionCount = intents.filter((i) => i.intentType === 'expansion_opportunity').length;

  // Count variants with expiring certs (approximation: pending status)
  const certExpiringCount = variants.filter(
    (v) => v.certificationStatus === 'pending' || v.certificationStatus === 'expired',
  ).length;

  const totalAlerts = suggestionCount + alertCount + expansionCount + certExpiringCount;
  const hasAlerts = totalAlerts > 0;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      <div className="absolute bottom-16 right-4 z-30">
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="relative w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 shadow-lg hover:shadow-indigo-500/20 transition-all hover:scale-105"
        >
          {/* Pulse ring for alerts */}
          {hasAlerts && !prefersReducedMotion && (
            <div className="absolute inset-0 rounded-full border-2 border-indigo-400/40 animate-ping" />
          )}

          {/* Brain icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2C6.5 2 4 4.5 4 7c0 1.5.7 2.8 1.8 3.7-.1.5-.3 1-.6 1.5-.3.5-.2 1.1.3 1.4.5.3 1.1.2 1.4-.3.4-.6.7-1.2.9-1.8.7.3 1.4.5 2.2.5s1.5-.2 2.2-.5c.2.6.5 1.2.9 1.8.3.5.9.6 1.4.3s.6-.9.3-1.4c-.3-.5-.5-1-.6-1.5C15.3 9.8 16 8.5 16 7c0-2.5-2.5-5-6-5z"
              fill="currentColor"
              className="text-indigo-400"
            />
            <path
              d="M8 14v3a2 2 0 002 2v0a2 2 0 002-2v-3"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-indigo-400/60"
            />
          </svg>

          {/* Total alert badge */}
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {totalAlerts > 99 ? '99+' : totalAlerts}
            </span>
          )}
        </button>

        {/* Badge pills below orb */}
        <div className="mt-2 flex flex-col items-end gap-1">
          {suggestionCount > 0 && (
            <BadgePill count={suggestionCount} label="suggestions" color="#6366f1" />
          )}
          {alertCount > 0 && <BadgePill count={alertCount} label="risk alerts" color="#ef4444" />}
          {certExpiringCount > 0 && (
            <BadgePill count={certExpiringCount} label="cert expiring" color="#f59e0b" />
          )}
          {expansionCount > 0 && (
            <BadgePill count={expansionCount} label="expansion" color="#10b981" />
          )}
        </div>
      </div>

      {/* Panel */}
      {panelOpen && <AgentBrainPanel onClose={() => setPanelOpen(false)} />}
    </>
  );
}

function BadgePill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-medium border"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
        color,
      }}
    >
      <span className="font-bold">{count}</span>
      <span>{label}</span>
    </div>
  );
}
