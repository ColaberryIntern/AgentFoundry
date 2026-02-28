import { GlassCard } from '../ui/GlassCard';
import { StatusBadge } from '../ui/StatusBadge';
import type { OrchestratorIntent, IntentType, Priority } from '../../types/orchestrator';

const intentTypeIcons: Record<IntentType, string> = {
  gap_coverage: 'GAP',
  drift_remediation: 'DRF',
  expansion_opportunity: 'EXP',
  certification_renewal: 'CRT',
  risk_mitigation: 'RSK',
  ontology_evolution: 'ONT',
  taxonomy_expansion: 'TAX',
  marketplace_submission: 'MKT',
};

const intentTypeColors: Record<IntentType, string> = {
  gap_coverage: 'bg-blue-500',
  drift_remediation: 'bg-amber-500',
  expansion_opportunity: 'bg-purple-500',
  certification_renewal: 'bg-emerald-500',
  risk_mitigation: 'bg-red-500',
  ontology_evolution: 'bg-cyan-500',
  taxonomy_expansion: 'bg-indigo-500',
  marketplace_submission: 'bg-pink-500',
};

const priorityBadgeVariant: Record<Priority, 'error' | 'warning' | 'info' | 'draft'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'draft',
};

interface IntentCardProps {
  intent: OrchestratorIntent;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  compact?: boolean;
}

export function IntentCard({ intent, onApprove, onReject, compact = false }: IntentCardProps) {
  const showActions =
    (intent.status === 'proposed' || intent.status === 'detected') && (onApprove || onReject);

  return (
    <GlassCard padding={compact ? 'sm' : 'md'} className={compact ? '' : 'space-y-3'}>
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className={`flex-shrink-0 w-9 h-9 rounded-lg ${intentTypeColors[intent.intentType]} flex items-center justify-center text-white text-[10px] font-bold`}
        >
          {intentTypeIcons[intent.intentType]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {intent.title}
            </h3>
          </div>
          {!compact && intent.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
              {intent.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusBadge variant={priorityBadgeVariant[intent.priority]} label={intent.priority} />
          <StatusBadge
            variant={
              intent.status === 'completed'
                ? 'completed'
                : intent.status === 'failed'
                  ? 'failed'
                  : intent.status === 'rejected'
                    ? 'revoked'
                    : intent.status === 'cancelled'
                      ? 'stopped'
                      : intent.status === 'executing' || intent.status === 'simulating'
                        ? 'running'
                        : intent.status === 'approved'
                          ? 'certified'
                          : intent.status === 'proposed'
                            ? 'pending'
                            : 'info'
            }
            label={intent.status}
          />
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span>Confidence: {(intent.confidenceScore * 100).toFixed(0)}%</span>
            <span>{new Date(intent.createdAt).toLocaleDateString()}</span>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              {onApprove && (
                <button
                  onClick={() => onApprove(intent.id)}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                >
                  Approve
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(intent.id)}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25 transition-colors"
                >
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
