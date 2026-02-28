import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchAgents } from '../store/agentsSlice';
import { fetchIntelligence } from '../store/registrySlice';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricRing } from '../components/ui/MetricRing';
import axios from 'axios';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'loading';
  uptime?: number;
}

const SERVICE_ENDPOINTS = [
  { name: 'API Gateway', path: '/api/health' },
  { name: 'User Service', path: '/api/users/health' },
  { name: 'Compliance', path: '/api/compliance/health' },
  { name: 'Reporting', path: '/api/reports/health' },
  { name: 'AI Recommend.', path: '/api/inference/health' },
  { name: 'Notifications', path: '/api/notifications/health' },
];

function timeAgo(date: string | Date | undefined | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function SystemHealthPage() {
  const dispatch = useAppDispatch();
  const { agents } = useAppSelector((state) => state.agents);
  const { intelligence, intelligenceLoading } = useAppSelector((state) => state.registry);

  const [services, setServices] = useState<ServiceStatus[]>(
    SERVICE_ENDPOINTS.map((s) => ({ name: s.name, status: 'loading' as const })),
  );

  useEffect(() => {
    dispatch(fetchAgents({}));
    dispatch(fetchIntelligence({}));
  }, [dispatch]);

  // Check service health
  useEffect(() => {
    SERVICE_ENDPOINTS.forEach(async (svc, idx) => {
      try {
        const res = await axios.get(svc.path, { timeout: 5000 });
        setServices((prev) => {
          const next = [...prev];
          next[idx] = { name: svc.name, status: 'online', uptime: res.data?.uptime };
          return next;
        });
      } catch {
        setServices((prev) => {
          const next = [...prev];
          next[idx] = { name: svc.name, status: 'offline' };
          return next;
        });
      }
    });
  }, []);

  const healthMetric = intelligence.find((i) => i.metricType === 'health');
  const coverageMetric = intelligence.find((i) => i.metricType === 'coverage');
  const driftMetric = intelligence.find((i) => i.metricType === 'drift');
  const exposureMetric = intelligence.find((i) => i.metricType === 'compliance_exposure');
  const expansionMetric = intelligence.find((i) => i.metricType === 'expansion_opportunity');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">System Health</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Autonomous agent monitoring and service health
        </p>
      </div>

      {/* Intelligence metric rings */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Intelligence Metrics
        </h2>
        {intelligenceLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-center gap-8 py-2">
            <MetricRing value={healthMetric?.score ?? 0} label="Health" />
            <MetricRing value={coverageMetric?.score ?? 0} label="Coverage" />
            <MetricRing value={driftMetric?.score ?? 0} label="Drift" />
            <MetricRing value={exposureMetric?.score ?? 0} label="Exposure" />
            <MetricRing value={expansionMetric?.score ?? 0} label="Expansion" />
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Background agents */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Background Agents
          </h2>
          {agents.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No agents running
            </p>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => {
                const metrics = agent.metrics as Record<string, unknown> | null;
                const checksCompleted = (metrics?.checksCompleted as number) ?? 0;
                const lastCheckDuration = (metrics?.lastCheckDuration as number) ?? 0;
                const healthStatus = (agent.healthStatus || 'unknown') as string;

                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {agent.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {checksCompleted} checks &middot; {lastCheckDuration}ms avg
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        variant={
                          healthStatus === 'healthy'
                            ? 'healthy'
                            : healthStatus === 'degraded'
                              ? 'degraded'
                              : healthStatus === 'unhealthy'
                                ? 'unhealthy'
                                : 'unknown'
                        }
                      />
                      <span className="text-xs text-[var(--text-muted)]">
                        {timeAgo(agent.lastHealthCheck)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Service health */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Service Health</h2>
          <div className="space-y-2">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5"
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">{svc.name}</span>
                <div className="flex items-center gap-2">
                  {svc.status === 'loading' ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <StatusBadge variant={svc.status === 'online' ? 'online' : 'offline'} />
                  )}
                  {svc.uptime != null && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {Math.floor(svc.uptime / 3600)}h up
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
