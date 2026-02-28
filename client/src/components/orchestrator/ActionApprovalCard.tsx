import { GlassCard } from '../ui/GlassCard';
import { StatusBadge } from '../ui/StatusBadge';
import { SimulationDelta } from './SimulationDelta';
import type { OrchestratorAction } from '../../types/orchestrator';

interface ActionApprovalCardProps {
  action: OrchestratorAction;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function ActionApprovalCard({ action, onApprove, onReject }: ActionApprovalCardProps) {
  const showActions =
    (action.status === 'awaiting_approval' || action.status === 'pending') &&
    (onApprove || onReject);

  const statusVariant =
    action.status === 'completed'
      ? 'completed'
      : action.status === 'failed'
        ? 'failed'
        : action.status === 'simulation_passed'
          ? 'certified'
          : action.status === 'simulation_failed'
            ? 'error'
            : action.status === 'executing' || action.status === 'simulating'
              ? 'running'
              : action.status === 'approved'
                ? 'active'
                : action.status === 'rolled_back'
                  ? 'revoked'
                  : action.status === 'awaiting_approval'
                    ? 'pending'
                    : 'draft';

  return (
    <GlassCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {action.actionType.replace(/_/g, ' ')}
            </span>
            <StatusBadge variant={statusVariant} label={action.status.replace(/_/g, ' ')} />
          </div>
          {action.targetEntityType && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Target: {action.targetEntityType}
              {action.targetEntityId ? ` (${action.targetEntityId.slice(0, 8)})` : ''}
            </p>
          )}
        </div>

        {action.requiresApproval && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
            Approval Required
          </span>
        )}
      </div>

      {/* Simulation result preview */}
      {action.simulationResult && <SimulationDelta simulation={action.simulationResult} />}

      {/* Error message */}
      {action.errorMessage && (
        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-xs text-red-700 dark:text-red-400">{action.errorMessage}</p>
        </div>
      )}

      {/* Action buttons */}
      {showActions && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {onApprove && (
            <button
              onClick={() => onApprove(action.id)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              Approve
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(action.id)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25 transition-colors"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
}
