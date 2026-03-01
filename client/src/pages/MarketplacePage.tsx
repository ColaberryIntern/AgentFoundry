import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchMarketplace } from '../store/orchestratorSlice';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MarketplaceCard } from '../components/orchestrator/MarketplaceCard';
import { DetailDrawer, DrawerField, DrawerIdField } from '../components/ui/DetailDrawer';
import type { MarketplaceSubmission, MarketplaceStatus } from '../types/orchestrator';

type StatusFilter = '' | MarketplaceStatus;

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

export default function MarketplacePage() {
  const dispatch = useAppDispatch();
  const { marketplace, marketplaceTotal, marketplaceLoading } = useAppSelector(
    (state) => state.orchestrator,
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MarketplaceSubmission | null>(null);

  useEffect(() => {
    dispatch(
      fetchMarketplace({
        page,
        limit: 20,
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
    );
  }, [dispatch, page, statusFilter]);

  const totalPages = Math.ceil(marketplaceTotal / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Agent Marketplace</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Browse, submit, and review agent listings for the marketplace
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--text-primary)]"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="testing">Testing</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
          <option value="delisted">Delisted</option>
        </select>
        <span className="text-sm text-[var(--text-muted)]">{marketplaceTotal} total</span>
      </div>

      {/* Content */}
      {marketplaceLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : marketplace.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
              />
            </svg>
            <p className="text-sm text-[var(--text-secondary)]">No marketplace submissions yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Marketplace submissions will appear here once agents are submitted for listing.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketplace.map((submission) => (
            <MarketplaceCard
              key={submission.id}
              submission={submission}
              onClick={() => setSelected(submission)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail drawer */}
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.submissionName || ''}
        subtitle="Marketplace Submission"
      >
        {selected && (
          <>
            <StatusBadge
              variant={(statusVariantMap[selected.status] || 'unknown') as 'draft'}
              label={selected.status.replace(/_/g, ' ')}
              size="md"
            />

            {selected.description && (
              <DrawerField label="Description">{selected.description}</DrawerField>
            )}

            <DrawerField label="Submitter">
              <span className="font-mono text-xs">{selected.submitterId}</span>
            </DrawerField>

            <DrawerField label="Certification Required">
              {selected.certificationRequired ? (
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs font-medium">
                  Required
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">Not required</span>
              )}
            </DrawerField>

            {selected.documentationUrl && (
              <DrawerField label="Documentation">
                <a
                  href={selected.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                >
                  {selected.documentationUrl}
                </a>
              </DrawerField>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selected.submittedAt && (
                <DrawerField label="Submitted">
                  {new Date(selected.submittedAt).toLocaleDateString()}
                </DrawerField>
              )}
              {selected.reviewedAt && (
                <DrawerField label="Reviewed">
                  {new Date(selected.reviewedAt).toLocaleDateString()}
                </DrawerField>
              )}
              {selected.publishedAt && (
                <DrawerField label="Published">
                  {new Date(selected.publishedAt).toLocaleDateString()}
                </DrawerField>
              )}
            </div>

            {selected.reviewNotes && selected.reviewNotes.length > 0 && (
              <DrawerField label="Review Notes">
                <div className="mt-1 space-y-2">
                  {(
                    selected.reviewNotes as Array<{
                      reviewer?: string;
                      note?: string;
                      date?: string;
                    }>
                  ).map((note, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 text-xs"
                    >
                      {note.note || JSON.stringify(note)}
                      {note.date && (
                        <span className="text-[var(--text-muted)] ml-2">
                          {new Date(note.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </DrawerField>
            )}

            {selected.listingMetadata && (
              <DrawerField label="Listing Metadata">
                <pre className="mt-1 p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(selected.listingMetadata, null, 2)}
                </pre>
              </DrawerField>
            )}

            {selected.agentVariantId && (
              <DrawerIdField label="Agent Variant ID" value={selected.agentVariantId} />
            )}
            <DrawerIdField label="Submission ID" value={selected.id} />
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
