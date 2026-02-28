import { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricRingInline } from '../components/ui/MetricRing';
import { registryApi } from '../services/registryApi';

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
  const [page, setPage] = useState(1);
  const [env, setEnv] = useState<EnvFilter>('');
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
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
      .catch(() => setDeployments([]))
      .finally(() => setLoading(false));
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

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : deployments.length === 0 ? (
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
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
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
    </div>
  );
}
