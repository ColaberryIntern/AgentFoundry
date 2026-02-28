import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchDashboard,
  fetchIntents,
  fetchActions,
  fetchViolations,
  fetchScans,
  approveIntent,
  rejectIntent,
  approveAction,
  rejectAction,
  resolveViolation,
} from '../store/orchestratorSlice';
import { GlassCard } from '../components/ui/GlassCard';
import { MetricRing } from '../components/ui/MetricRing';
import { IntentCard } from '../components/orchestrator/IntentCard';
import { ActionApprovalCard } from '../components/orchestrator/ActionApprovalCard';
import { GuardrailViolationBanner } from '../components/orchestrator/GuardrailViolationBanner';
import { OrchestratorTimeline } from '../components/orchestrator/OrchestratorTimeline';

export default function OrchestratorPage() {
  const dispatch = useAppDispatch();
  const { dashboard, dashboardLoading, intents, intentsLoading, actions, violations, scans } =
    useAppSelector((state) => state.orchestrator);

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchIntents({ limit: 10 }));
    dispatch(fetchActions({ status: 'awaiting_approval', limit: 10 }));
    dispatch(fetchViolations({ resolved: 'false', limit: 10 }));
    dispatch(fetchScans({ limit: 10 }));
  }, [dispatch]);

  const handleApproveIntent = (id: string) => {
    dispatch(approveIntent({ id })).then(() => {
      dispatch(fetchDashboard());
      dispatch(fetchIntents({ limit: 10 }));
    });
  };

  const handleRejectIntent = (id: string) => {
    dispatch(rejectIntent({ id, reason: 'Rejected from dashboard' })).then(() => {
      dispatch(fetchDashboard());
      dispatch(fetchIntents({ limit: 10 }));
    });
  };

  const handleApproveAction = (id: string) => {
    dispatch(approveAction({ id })).then(() => {
      dispatch(fetchDashboard());
      dispatch(fetchActions({ status: 'awaiting_approval', limit: 10 }));
    });
  };

  const handleRejectAction = (id: string) => {
    dispatch(rejectAction({ id, reason: 'Rejected from dashboard' })).then(() => {
      dispatch(fetchDashboard());
      dispatch(fetchActions({ status: 'awaiting_approval', limit: 10 }));
    });
  };

  const handleResolveViolation = (id: string) => {
    dispatch(resolveViolation({ id, reason: 'Resolved from dashboard' })).then(() => {
      dispatch(fetchDashboard());
      dispatch(fetchViolations({ resolved: 'false', limit: 10 }));
    });
  };

  const pendingActions = actions.filter(
    (a) => a.status === 'awaiting_approval' || a.status === 'pending',
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Executive Orchestrator</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Autonomous agent management, approval workflows, and system governance
        </p>
      </div>

      {/* Summary metrics */}
      {dashboardLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <GlassCard className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {dashboard?.activeIntents ?? 0}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Active Intents</div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {dashboard?.pendingApprovals ?? 0}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Pending Approvals</div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {dashboard?.guardrailViolations ?? 0}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Violations</div>
          </GlassCard>
          <GlassCard className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {dashboard?.completedToday ?? 0}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Completed Today</div>
          </GlassCard>
          <GlassCard className="flex items-center justify-center">
            <MetricRing
              value={dashboard?.systemConfidence ?? 0}
              label="Confidence"
              size={70}
              strokeWidth={5}
            />
          </GlassCard>
        </div>
      )}

      {/* Autonomy mode badge */}
      {dashboard?.autonomyMode && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Autonomy Mode:</span>
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              dashboard.autonomyMode === 'full_autonomous'
                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                : dashboard.autonomyMode === 'semi_autonomous'
                  ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-400'
            }`}
          >
            {dashboard.autonomyMode.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Guardrail violations banner */}
      <GuardrailViolationBanner violations={violations} onResolve={handleResolveViolation} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Intents */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recent Intents</h2>
          {intentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : intents.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No intents detected yet. The orchestrator will detect signals on its next scan cycle.
            </p>
          ) : (
            <div className="space-y-3">
              {intents.slice(0, 6).map((intent) => (
                <IntentCard
                  key={intent.id}
                  intent={intent}
                  compact
                  onApprove={handleApproveIntent}
                  onReject={handleRejectIntent}
                />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Pending Approvals */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Pending Approvals
          </h2>
          {pendingActions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No actions awaiting approval
            </p>
          ) : (
            <div className="space-y-3">
              {pendingActions.slice(0, 5).map((action) => (
                <ActionApprovalCard
                  key={action.id}
                  action={action}
                  onApprove={handleApproveAction}
                  onReject={handleRejectAction}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Scan Activity Timeline */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Scan Activity</h2>
        <OrchestratorTimeline scans={scans} />
      </GlassCard>
    </div>
  );
}
