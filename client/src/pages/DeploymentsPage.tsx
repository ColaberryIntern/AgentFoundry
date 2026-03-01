import { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricRing, MetricRingInline } from '../components/ui/MetricRing';
import { registryApi } from '../services/registryApi';
import { DetailDrawer, DrawerField, DrawerIdField } from '../components/ui/DetailDrawer';

interface DeploymentRecord {
  id: string;
  agentStackId: string;
  agentVariantId: string;
  environment: string;
  activeStatus: boolean;
  performanceScore: number | null;
  lastExecution: string | null;
  executionCount: number;
  errorCount: number;
  deployedAt: string;
  variant?: { name: string };
}

type EnvFilter = '' | 'development' | 'staging' | 'production';

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [env, setEnv] = useState<EnvFilter>('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selected, setSelected] = useState<DeploymentRecord | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    registryApi
      .getDeployments({
        page,
        limit: 20,
        ...(env ? { environment: env } : {}),
        ...(activeOnly ? { active_status: 'true' } : {}),
      })
      .then((res) => {
        setDeployments(res.data?.data || []);
        setTotal(res.data?.pagination?.total || 0);
      })
      .catch(() => {
        setDeployments([]);
        setError('Failed to load deployments. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [page, env, activeOnly]);

  const totalPages = Math.ceil(total / 20);

  function errorRate(d: DeploymentRecord): number {
    if (d.executionCount === 0) return 0;
    return (d.errorCount / d.executionCount) * 100;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Deployments</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Active deployment instances across environments
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={env}
          onChange={(e) => {
            setEnv(e.target.value as EnvFilter);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--text-primary)]"
        >
          <option value="">All Environments</option>
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => {
              setActiveOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-gray-300 dark:border-white/20"
          />
          Active only
        </label>
        <span className="text-sm text-[var(--text-muted)]">{total} total</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          <button
            onClick={fetchData}
            className="text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : deployments.length === 0 && !error ? (
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)] text-center py-12">
            No deployments found
          </p>
        </GlassCard>
      ) : (
        <GlassCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Deployment
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Env
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Performance
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Executions
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Error Rate
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Status
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Deployed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {deployments.map((d) => {
                  const er = errorRate(d);
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelected(d)}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="p-3">
                        <span className="font-medium text-[var(--text-primary)]">
                          {d.variant?.name || d.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge
                          variant={
                            d.environment === 'production'
                              ? 'running'
                              : d.environment === 'staging'
                                ? 'pending'
                                : 'draft'
                          }
                          label={d.environment}
                          dot={false}
                        />
                      </td>
                      <td className="p-3">
                        <MetricRingInline
                          value={d.performanceScore || 0}
                          size={30}
                          strokeWidth={2.5}
                        />
                      </td>
                      <td className="p-3 text-[var(--text-secondary)] font-mono">
                        {d.executionCount.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-mono ${
                            er > 10
                              ? 'text-red-600 dark:text-red-400'
                              : er > 5
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {er.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge
                          variant={d.activeStatus ? 'active' : 'stopped'}
                          label={d.activeStatus ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {d.deployedAt ? new Date(d.deployedAt).toLocaleDateString() : '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
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
        title={selected?.variant?.name || selected?.id.slice(0, 8) || ''}
        subtitle="Deployment Detail"
      >
        {selected && (
          <>
            <div className="flex items-center gap-3">
              <StatusBadge
                variant={
                  selected.environment === 'production'
                    ? 'running'
                    : selected.environment === 'staging'
                      ? 'pending'
                      : 'draft'
                }
                label={selected.environment}
                dot={false}
                size="md"
              />
              <StatusBadge
                variant={selected.activeStatus ? 'active' : 'stopped'}
                label={selected.activeStatus ? 'Active' : 'Inactive'}
                size="md"
              />
            </div>

            <DrawerField label="Performance Score">
              <div className="flex justify-center py-2">
                <MetricRing
                  value={selected.performanceScore || 0}
                  label="Performance"
                  size={90}
                  strokeWidth={6}
                />
              </div>
            </DrawerField>

            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Executions">
                <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
                  {selected.executionCount.toLocaleString()}
                </span>
              </DrawerField>
              <DrawerField label="Errors">
                <span className="text-lg font-bold font-mono text-red-600 dark:text-red-400">
                  {selected.errorCount.toLocaleString()}
                </span>
              </DrawerField>
            </div>

            <DrawerField label="Error Rate">
              <div className="flex items-center gap-2 mt-1">
                {(() => {
                  const er = errorRate(selected);
                  return (
                    <>
                      <div className="flex-1 h-2.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            er > 10 ? 'bg-red-500' : er > 5 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(er, 100)}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-mono font-medium ${
                          er > 10
                            ? 'text-red-600 dark:text-red-400'
                            : er > 5
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {er.toFixed(1)}%
                      </span>
                    </>
                  );
                })()}
              </div>
            </DrawerField>

            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Deployed">
                {selected.deployedAt ? new Date(selected.deployedAt).toLocaleDateString() : '--'}
              </DrawerField>
              <DrawerField label="Last Execution">
                {selected.lastExecution
                  ? new Date(selected.lastExecution).toLocaleString()
                  : 'Never'}
              </DrawerField>
            </div>

            <DrawerIdField label="Deployment ID" value={selected.id} />
            <DrawerIdField label="Agent Stack ID" value={selected.agentStackId} />
            <DrawerIdField label="Agent Variant ID" value={selected.agentVariantId} />
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
