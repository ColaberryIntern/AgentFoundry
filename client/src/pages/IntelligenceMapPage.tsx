import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchIndustries,
  fetchUseCases,
  fetchAgentSkeletons,
  fetchAgentVariants,
  fetchIntelligence,
} from '../store/registrySlice';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricRingInline } from '../components/ui/MetricRing';

export default function IntelligenceMapPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const { industries, useCases, skeletons, variants, intelligence, industriesLoading, loading } =
    useAppSelector((state) => state.registry);

  useEffect(() => {
    if (!user) return;
    dispatch(fetchIndustries({ page: 1, limit: 100 }));
    dispatch(fetchUseCases({ page: 1, limit: 100 }));
    dispatch(fetchAgentSkeletons());
    dispatch(fetchAgentVariants({ page: 1, limit: 100 }));
    dispatch(fetchIntelligence({}));
  }, [dispatch, user]);

  // Not logged in — show landing
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
            A
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-4">
            Agent OS
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Cross-Industry Autonomous Agent Operating System. AI-powered regulatory compliance with
            real-time intelligence mapping.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-3 bg-white dark:bg-white/10 text-[var(--text-primary)] border border-gray-200 dark:border-white/10 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-white/15 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  const healthMetric = intelligence.find((i) => i.metricType === 'health');

  // Count variants by certification status
  const certifiedCount = variants.filter((v) => v.certificationStatus === 'certified').length;
  const pendingCount = variants.filter((v) => v.certificationStatus === 'pending').length;

  const isLoading = industriesLoading || loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Intelligence Map</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Cross-industry agent intelligence registry overview
          </p>
        </div>
      </div>

      {/* Intelligence metrics strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <GlassCard padding="sm">
          <div className="text-xs text-[var(--text-muted)]">Industries</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{industries.length}</div>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="text-xs text-[var(--text-muted)]">Use Cases</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{useCases.length}</div>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="text-xs text-[var(--text-muted)]">Agent Types</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{skeletons.length}</div>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="text-xs text-[var(--text-muted)]">Variants</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{variants.length}</div>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="text-xs text-[var(--text-muted)]">Certified</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {certifiedCount}
            </span>
            {pendingCount > 0 && (
              <StatusBadge variant="pending" label={`${pendingCount} pending`} />
            )}
          </div>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="text-xs text-[var(--text-muted)]">System Health</div>
          <div className="flex items-center gap-2">
            {healthMetric ? (
              <MetricRingInline value={healthMetric.score} />
            ) : (
              <span className="text-2xl font-bold text-[var(--text-secondary)]">--</span>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Industries panel */}
        <GlassCard className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            NAICS Industries
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : industries.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
              No industries registered
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {industries.slice(0, 12).map((ind) => {
                const industryVariants = variants.filter((v) => v.industryCode === ind.code);
                return (
                  <div
                    key={ind.code}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    onClick={() => navigate('/use-cases')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                      {ind.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {ind.title}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {industryVariants.length} agent{industryVariants.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {industryVariants.length > 0 && (
                      <MetricRingInline
                        value={
                          (industryVariants.filter((v) => v.certificationStatus === 'certified')
                            .length /
                            industryVariants.length) *
                          100
                        }
                        size={28}
                        strokeWidth={2.5}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {industries.length > 12 && (
            <button
              onClick={() => navigate('/use-cases')}
              className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all {industries.length} industries
            </button>
          )}
        </GlassCard>

        {/* Right sidebar — Agent Skeletons + Intelligence */}
        <div className="space-y-6">
          <GlassCard>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Agent Types</h2>
            <div className="space-y-3">
              {skeletons.map((sk) => {
                const skVariants = variants.filter((v) => v.skeletonId === sk.id);
                return (
                  <div
                    key={sk.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                    onClick={() => navigate('/agents')}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-purple-600 dark:text-purple-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {sk.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] capitalize">
                          {sk.specializationType?.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {skVariants.length} variants
                    </span>
                  </div>
                );
              })}
              {skeletons.length === 0 && !loading && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  No agent types registered
                </p>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              System Intelligence
            </h2>
            <div className="space-y-3">
              {intelligence.length > 0 ? (
                intelligence.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)] capitalize">
                      {m.metricType?.replace(/_/g, ' ')}
                    </span>
                    <MetricRingInline value={m.score} size={30} strokeWidth={2.5} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  {loading ? 'Loading...' : 'No intelligence data'}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/system-health')}
              className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View System Health
            </button>
          </GlassCard>
        </div>
      </div>

      {/* Use Cases section */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active Use Cases</h2>
          <button
            onClick={() => navigate('/use-cases')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
          </button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : useCases.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-8">
            No use cases registered
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {useCases.slice(0, 6).map((uc) => (
              <div
                key={uc.id}
                className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5"
              >
                <div className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-2">
                  {uc.outcomeStatement}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge
                    variant={
                      uc.status === 'active'
                        ? 'active'
                        : uc.status === 'draft'
                          ? 'draft'
                          : 'stopped'
                    }
                    label={uc.status}
                  />
                  {uc.monetizationType && (
                    <span className="text-xs text-[var(--text-muted)] capitalize">
                      {uc.monetizationType.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                {uc.urgencyScore != null && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${uc.urgencyScore * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {Math.round(uc.urgencyScore * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
