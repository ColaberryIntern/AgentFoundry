import { GlassCard } from '../ui/GlassCard';
import { StatusBadge } from '../ui/StatusBadge';
import type { MarketplaceSubmission } from '../../types/orchestrator';

interface MarketplaceCardProps {
  submission: MarketplaceSubmission;
  onReview?: (id: string) => void;
}

const statusVariantMap: Record<string, string> = {
  draft: 'draft',
  submitted: 'info',
  under_review: 'pending',
  testing: 'running',
  approved: 'certified',
  rejected: 'failed',
  published: 'active',
  delisted: 'stopped',
};

export function MarketplaceCard({ submission, onReview }: MarketplaceCardProps) {
  return (
    <GlassCard hover={!!onReview} className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {submission.submissionName}
          </h3>
          {submission.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
              {submission.description}
            </p>
          )}
        </div>
        <StatusBadge
          variant={(statusVariantMap[submission.status] || 'unknown') as 'draft'}
          label={submission.status.replace(/_/g, ' ')}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span>Submitter: {submission.submitterId.slice(0, 8)}</span>
          {submission.certificationRequired && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[10px] font-medium">
              Cert Required
            </span>
          )}
        </div>
        {onReview &&
          (submission.status === 'submitted' || submission.status === 'under_review') && (
            <button
              onClick={() => onReview(submission.id)}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 transition-colors"
            >
              Review
            </button>
          )}
      </div>

      {submission.publishedAt && (
        <div className="text-[10px] text-[var(--text-muted)]">
          Published: {new Date(submission.publishedAt).toLocaleDateString()}
        </div>
      )}
    </GlassCard>
  );
}
