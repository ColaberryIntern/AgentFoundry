import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchMarketplace } from '../store/orchestratorSlice';
import { GlassCard } from '../components/ui/GlassCard';
import { MarketplaceCard } from '../components/orchestrator/MarketplaceCard';
import type { MarketplaceStatus } from '../types/orchestrator';

type StatusFilter = '' | MarketplaceStatus;

export default function MarketplacePage() {
  const dispatch = useAppDispatch();
  const { marketplace, marketplaceTotal, marketplaceLoading } = useAppSelector(
    (state) => state.orchestrator,
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);

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
            <MarketplaceCard key={submission.id} submission={submission} />
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
    </div>
  );
}
