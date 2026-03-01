import { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { ApprovalQueue } from './ApprovalQueue';
import { BlastRadiusViz } from './BlastRadiusViz';

interface GovernanceOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function GovernanceOverlay({ open, onClose }: GovernanceOverlayProps) {
  const [tab, setTab] = useState<'approvals' | 'blast'>('approvals');
  const intents = useAppSelector((s) => s.orchestrator.intents);
  const actions = useAppSelector((s) => s.orchestrator.actions);
  const violations = useAppSelector((s) => s.orchestrator.violations);

  const pendingIntents = intents.filter((i) => i.status === 'proposed');
  const pendingActions = actions.filter((a) => a.status === 'awaiting_approval');
  const unresolvedViolations = violations.filter((v) => !v.resolved);

  const totalPending = pendingIntents.length + pendingActions.length;

  if (!open) return null;

  return (
    <div className="absolute top-0 left-0 bottom-0 z-40 w-[400px] bg-[var(--surface-primary)]/95 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="text-sm font-bold text-[var(--text-primary)]">Governance</span>
          {totalPending > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded-full">
              {totalPending}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5 text-[10px] text-[var(--text-muted)]">
        <span>{pendingIntents.length} pending intents</span>
        <span>{pendingActions.length} pending actions</span>
        <span className={unresolvedViolations.length > 0 ? 'text-red-400' : ''}>
          {unresolvedViolations.length} violations
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setTab('approvals')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${tab === 'approvals' ? 'text-amber-300 border-b-2 border-amber-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
        >
          Approval Queue
        </button>
        <button
          onClick={() => setTab('blast')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${tab === 'blast' ? 'text-amber-300 border-b-2 border-amber-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
        >
          Blast Radius
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'approvals' ? (
          <ApprovalQueue
            intents={pendingIntents}
            actions={pendingActions}
            violations={unresolvedViolations}
          />
        ) : (
          <BlastRadiusViz />
        )}
      </div>
    </div>
  );
}
