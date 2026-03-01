import { useAppDispatch } from '../../store/hooks';
import {
  approveIntent,
  rejectIntent,
  approveAction,
  rejectAction,
  resolveViolation,
} from '../../store/orchestratorSlice';
import type {
  OrchestratorIntent,
  OrchestratorAction,
  GuardrailViolation,
} from '../../types/orchestrator';

interface ApprovalQueueProps {
  intents: OrchestratorIntent[];
  actions: OrchestratorAction[];
  violations: GuardrailViolation[];
}

export function ApprovalQueue({ intents, actions, violations }: ApprovalQueueProps) {
  const dispatch = useAppDispatch();

  if (intents.length === 0 && actions.length === 0 && violations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <svg
          className="w-10 h-10 text-emerald-400/50 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-sm text-[var(--text-primary)]">All Clear</div>
        <div className="text-xs text-[var(--text-muted)] mt-1">
          No pending approvals or violations
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Pending Intents */}
      {intents.map((intent) => (
        <div key={intent.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-blue-400 uppercase font-medium">Intent</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                intent.priority === 'critical'
                  ? 'bg-red-500/10 text-red-400'
                  : intent.priority === 'high'
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              {intent.priority}
            </span>
          </div>
          <div className="text-xs text-[var(--text-primary)] mb-1">{intent.title}</div>
          {intent.description && (
            <div className="text-[10px] text-[var(--text-muted)] mb-2 line-clamp-2">
              {intent.description}
            </div>
          )}
          <div className="text-[10px] text-[var(--text-muted)] mb-2 capitalize">
            {intent.intentType.replace(/_/g, ' ')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                dispatch(
                  approveIntent({ id: intent.id, reason: 'Approved via governance overlay' }),
                )
              }
              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() =>
                dispatch(rejectIntent({ id: intent.id, reason: 'Rejected via governance overlay' }))
              }
              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {/* Pending Actions */}
      {actions.map((action) => (
        <div key={action.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-purple-400 uppercase font-medium">Action</span>
          </div>
          <div className="text-xs text-[var(--text-primary)] mb-1 capitalize">
            {action.actionType.replace(/_/g, ' ')}
          </div>
          {action.targetEntityType && (
            <div className="text-[10px] text-[var(--text-muted)] mb-2">
              Target: {action.targetEntityType} {action.targetEntityId ?? ''}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                dispatch(
                  approveAction({ id: action.id, reason: 'Approved via governance overlay' }),
                )
              }
              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() =>
                dispatch(rejectAction({ id: action.id, reason: 'Rejected via governance overlay' }))
              }
              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {/* Violations */}
      {violations.map((v) => (
        <div key={v.id} className="p-3 rounded-lg bg-red-500/[0.03] border border-red-500/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-red-400 uppercase font-medium">Violation</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                v.severity === 'block'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {v.severity}
            </span>
          </div>
          <div className="text-xs text-[var(--text-primary)] mb-1 capitalize">
            {v.guardrailType.replace(/_/g, ' ')}
          </div>
          {v.guardrailKey && (
            <div className="text-[10px] text-[var(--text-muted)] mb-2">Key: {v.guardrailKey}</div>
          )}
          <button
            onClick={() =>
              dispatch(resolveViolation({ id: v.id, reason: 'Resolved via governance overlay' }))
            }
            className="w-full px-2 py-1 text-[10px] font-medium rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            Resolve
          </button>
        </div>
      ))}
    </div>
  );
}
