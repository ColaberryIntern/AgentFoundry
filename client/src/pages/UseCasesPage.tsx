import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { registryApi } from '../services/registryApi';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  DetailDrawer,
  DrawerField,
  DrawerIdField,
  DrawerScoreBar,
} from '../components/ui/DetailDrawer';

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
  version?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function UseCasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const industryFilter = searchParams.get('industry') || '';

  const [useCases, setUseCases] = useState<UseCaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [monetization, setMonetization] = useState<MonetizationFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [selected, setSelected] = useState<UseCaseItem | null>(null);

  const clearIndustryFilter = () => {
    setSearchParams((prev) => {
      prev.delete('industry');
      return prev;
    });
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    registryApi
      .getUseCases({
        page: industryFilter ? 1 : page,
        limit: industryFilter ? 100 : 20,
        ...(status ? { status } : {}),
        ...(monetization ? { monetization_type: monetization } : {}),
      })
      .then((res) => {
        let items: UseCaseItem[] = res.data?.data || [];
        if (industryFilter) {
          items = items.filter((uc) =>
            uc.industryScope?.some(
              (code) => code === industryFilter || code.startsWith(industryFilter),
            ),
          );
        }
        setUseCases(items);
        setTotal(industryFilter ? items.length : res.data?.pagination?.total || 0);
      })
      .catch(() => {
        setUseCases([]);
        setError('Failed to load use cases. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [page, monetization, status, industryFilter]);

  const totalPages = Math.ceil(total / (industryFilter ? total || 1 : 20));

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
        {industryFilter && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400">
            Industry: {industryFilter}
            <button
              onClick={clearIndustryFilter}
              className="hover:text-blue-900 dark:hover:text-blue-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          <button
            onClick={() => {
              setError(null);
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
                .catch(() => setError('Failed to load use cases. Please try again.'))
                .finally(() => setLoading(false));
            }}
            className="text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Use cases grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : useCases.length === 0 && !error ? (
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)] text-center py-12">
            No use cases found
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((uc) => (
            <GlassCard key={uc.id} hover onClick={() => setSelected(uc)}>
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
              {((uc.regulatoryScope && uc.regulatoryScope.length > 0) ||
                (uc.industryScope && uc.industryScope.length > 0)) && (
                <div className="mt-3 space-y-1">
                  {uc.regulatoryScope && uc.regulatoryScope.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(uc.regulatoryScope as string[]).slice(0, 4).map((reg: string) => (
                        <span
                          key={reg}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400"
                        >
                          {reg}
                        </span>
                      ))}
                      {(uc.regulatoryScope as string[]).length > 4 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-white/5 text-[var(--text-muted)]">
                          +{(uc.regulatoryScope as string[]).length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  {uc.industryScope && uc.industryScope.length > 0 && (
                    <div className="flex flex-wrap gap-1">
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

      {/* Detail drawer */}
      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Use Case Detail"
        subtitle={
          selected?.regulatoryScope?.length
            ? selected.regulatoryScope.join(', ')
            : selected?.monetizationType?.replace(/_/g, ' ') || ''
        }
      >
        {selected && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                variant={
                  selected.status === 'active'
                    ? 'active'
                    : selected.status === 'draft'
                      ? 'draft'
                      : 'stopped'
                }
                label={selected.status}
              />
              {selected.monetizationType && (
                <StatusBadge
                  variant="info"
                  label={selected.monetizationType.replace(/_/g, ' ')}
                  dot={false}
                />
              )}
            </div>

            <DrawerField label="What This Use Case Does">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed mt-1">
                {selected.outcomeStatement}
              </p>
            </DrawerField>

            {selected.monetizationType && (
              <DrawerField label="Why It's Needed">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-1">
                  {selected.monetizationType === 'cost_reduction' &&
                    'This use case targets cost reduction by automating compliance workflows and eliminating manual overhead.'}
                  {selected.monetizationType === 'revenue_generation' &&
                    'This use case drives revenue generation by enabling new compliance-related services and market opportunities.'}
                  {selected.monetizationType === 'risk_mitigation' &&
                    'This use case focuses on risk mitigation by identifying and addressing regulatory exposure before it becomes a liability.'}
                  {selected.monetizationType === 'compliance_automation' &&
                    'This use case automates compliance processes to ensure continuous regulatory adherence with minimal manual intervention.'}
                </p>
              </DrawerField>
            )}

            {selected.measurableKpi && (
              <DrawerField label="Measurable KPI">{selected.measurableKpi}</DrawerField>
            )}

            {selected.urgencyScore != null && (
              <DrawerScoreBar label="Urgency Score" value={selected.urgencyScore} />
            )}

            {selected.capitalDependencyScore != null && (
              <DrawerScoreBar label="Capital Dependency" value={selected.capitalDependencyScore} />
            )}

            {selected.industryScope && selected.industryScope.length > 0 && (
              <DrawerField label="Industry Scope">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(selected.industryScope as string[]).map((code: string) => (
                    <span
                      key={code}
                      className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </DrawerField>
            )}

            {selected.regulatoryScope && selected.regulatoryScope.length > 0 && (
              <DrawerField label="Regulatory Scope">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(selected.regulatoryScope as string[]).map((code: string) => (
                    <span
                      key={code}
                      className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </DrawerField>
            )}

            {selected.version != null && (
              <DrawerField label="Version">v{selected.version}</DrawerField>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selected.createdAt && (
                <DrawerField label="Created">
                  {new Date(selected.createdAt).toLocaleDateString()}
                </DrawerField>
              )}
              {selected.updatedAt && (
                <DrawerField label="Updated">
                  {new Date(selected.updatedAt).toLocaleDateString()}
                </DrawerField>
              )}
            </div>

            <DrawerIdField label="Use Case ID" value={selected.id} />
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
