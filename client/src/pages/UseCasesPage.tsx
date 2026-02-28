import { useEffect, useState } from 'react';
import { registryApi } from '../services/registryApi';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';

type MonetizationFilter =
  | ''
  | 'cost_reduction'
  | 'revenue_generation'
  | 'risk_mitigation'
  | 'compliance_automation';
type StatusFilter = '' | 'active' | 'draft' | 'deprecated';

interface UseCaseItem {
  id: string;
  outcomeStatement: string;
  measurableKpi?: string | null;
  industryScope?: string[] | null;
  regulatoryScope?: string[] | null;
  urgencyScore?: number | null;
  capitalDependencyScore?: number | null;
  monetizationType?: string | null;
  status: string;
}

export default function UseCasesPage() {
  const [useCases, setUseCases] = useState<UseCaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [monetization, setMonetization] = useState<MonetizationFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');

  useEffect(() => {
    setLoading(true);
    registryApi
      .getUseCases({
        page,
        limit: 20,
        ...(status ? { status } : {}),
        ...(monetization ? { monetization_type: monetization } : {}),
      })
      .then((res) => {
        setUseCases(res.data?.data || []);
        setTotal(res.data?.pagination?.total || 0);
      })
      .catch(() => setUseCases([]))
      .finally(() => setLoading(false));
  }, [page, monetization, status]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Use Cases</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Registry of compliance and regulatory use cases
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--text-primary)]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="deprecated">Deprecated</option>
        </select>
        <select
          value={monetization}
          onChange={(e) => {
            setMonetization(e.target.value as MonetizationFilter);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--text-primary)]"
        >
          <option value="">All Types</option>
          <option value="cost_reduction">Cost Reduction</option>
          <option value="revenue_generation">Revenue Generation</option>
          <option value="risk_mitigation">Risk Mitigation</option>
          <option value="compliance_automation">Compliance Automation</option>
        </select>
        <span className="text-sm text-[var(--text-muted)]">{total} total</span>
      </div>

      {/* Use cases grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : useCases.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)] text-center py-12">
            No use cases found
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((uc) => (
            <GlassCard key={uc.id} hover>
              <div className="text-sm font-medium text-[var(--text-primary)] line-clamp-3 mb-3">
                {uc.outcomeStatement}
              </div>
              {uc.measurableKpi && (
                <div className="text-xs text-[var(--text-muted)] mb-3">KPI: {uc.measurableKpi}</div>
              )}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <StatusBadge
                  variant={
                    uc.status === 'active' ? 'active' : uc.status === 'draft' ? 'draft' : 'stopped'
                  }
                  label={uc.status}
                />
                {uc.monetizationType && (
                  <StatusBadge
                    variant="info"
                    label={uc.monetizationType.replace(/_/g, ' ')}
                    dot={false}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                {uc.urgencyScore != null && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span>Urgency</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${uc.urgencyScore * 100}%` }}
                      />
                    </div>
                    <span>{Math.round(uc.urgencyScore * 100)}%</span>
                  </div>
                )}
              </div>
              {uc.industryScope && uc.industryScope.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(uc.industryScope as string[]).slice(0, 3).map((code: string) => (
                    <span
                      key={code}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400"
                    >
                      {code}
                    </span>
                  ))}
                  {(uc.industryScope as string[]).length > 3 && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-white/5 text-[var(--text-muted)]">
                      +{(uc.industryScope as string[]).length - 3}
                    </span>
                  )}
                </div>
              )}
            </GlassCard>
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
