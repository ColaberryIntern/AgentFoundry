import { useEffect, useState } from 'react';
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
import { StatusBadge } from '../components/ui/StatusBadge';
import { IntentCard } from '../components/orchestrator/IntentCard';
import { ActionApprovalCard } from '../components/orchestrator/ActionApprovalCard';
import { GuardrailViolationBanner } from '../components/orchestrator/GuardrailViolationBanner';
import { OrchestratorTimeline } from '../components/orchestrator/OrchestratorTimeline';
import {
  DetailDrawer,
  DrawerField,
  DrawerIdField,
  DrawerScoreBar,
} from '../components/ui/DetailDrawer';
import { orchestratorApi } from '../services/orchestratorApi';
import type { OrchestratorIntent, OrchestratorAction } from '../types/orchestrator';

export default function OrchestratorPage() {
  const dispatch = useAppDispatch();
  const { dashboard, dashboardLoading, intents, intentsLoading, actions, violations, scans } =
    useAppSelector((state) => state.orchestrator);

  const [selectedIntent, setSelectedIntent] = useState<OrchestratorIntent | null>(null);
  const [intentActions, setIntentActions] = useState<OrchestratorAction[]>([]);
  const [intentDetailLoading, setIntentDetailLoading] = useState(false);

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

  const handleIntentClick = (intent: OrchestratorIntent) => {
    setSelectedIntent(intent);
    setIntentDetailLoading(true);
    orchestratorApi
      .getIntentById(intent.id)
      .then((res) => {
        setIntentActions(res.data?.actions || []);
      })
      .catch(() => {
        setIntentActions([]);
      })
      .finally(() => setIntentDetailLoading(false));
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
                  onClick={() => handleIntentClick(intent)}
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

      {/* Intent Detail Drawer */}
      <DetailDrawer
        open={!!selectedIntent}
        onClose={() => {
          setSelectedIntent(null);
          setIntentActions([]);
        }}
        title={selectedIntent?.title || ''}
        subtitle="Intent Detail"
      >
        {selectedIntent && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                variant={
                  selectedIntent.status === 'completed'
                    ? 'completed'
                    : selectedIntent.status === 'failed'
                      ? 'failed'
                      : selectedIntent.status === 'rejected'
                        ? 'revoked'
                        : selectedIntent.status === 'approved'
                          ? 'certified'
                          : selectedIntent.status === 'proposed'
                            ? 'pending'
                            : 'info'
                }
                label={selectedIntent.status}
                size="md"
              />
              <StatusBadge
                variant={
                  selectedIntent.priority === 'critical'
                    ? 'error'
                    : selectedIntent.priority === 'high'
                      ? 'warning'
                      : 'info'
                }
                label={selectedIntent.priority}
                size="md"
              />
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-white/5 text-[var(--text-secondary)]">
                {selectedIntent.intentType.replace(/_/g, ' ')}
              </span>
            </div>

            <DrawerScoreBar label="Confidence" value={selectedIntent.confidenceScore} />

            <DrawerField label="Source Signal">{selectedIntent.sourceSignal}</DrawerField>

            {selectedIntent.description && (
              <DrawerField label="Description">{selectedIntent.description}</DrawerField>
            )}

            {selectedIntent.context && Object.keys(selectedIntent.context).length > 0 && (
              <DrawerField label="Context">
                <pre className="mt-1 p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(selectedIntent.context, null, 2)}
                </pre>
              </DrawerField>
            )}

            {selectedIntent.recommendedActions && selectedIntent.recommendedActions.length > 0 && (
              <DrawerField label="Recommended Actions">
                <ul className="mt-1 space-y-1">
                  {selectedIntent.recommendedActions.map((action, i) => (
                    <li
                      key={i}
                      className="text-xs p-2 rounded bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5"
                    >
                      {JSON.stringify(action)}
                    </li>
                  ))}
                </ul>
              </DrawerField>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selectedIntent.resolvedBy && (
                <DrawerField label="Resolved By">{selectedIntent.resolvedBy}</DrawerField>
              )}
              {selectedIntent.resolvedAt && (
                <DrawerField label="Resolved At">
                  {new Date(selectedIntent.resolvedAt).toLocaleString()}
                </DrawerField>
              )}
              {selectedIntent.expiresAt && (
                <DrawerField label="Expires At">
                  {new Date(selectedIntent.expiresAt).toLocaleString()}
                </DrawerField>
              )}
              <DrawerField label="Created">
                {new Date(selectedIntent.createdAt).toLocaleString()}
              </DrawerField>
            </div>

            {/* Child Actions */}
            <div className="border-t border-gray-200 dark:border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Actions ({intentActions.length})
              </h3>
              {intentDetailLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : intentActions.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">
                  No actions created for this intent
                </p>
              ) : (
                <div className="space-y-2">
                  {intentActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {action.actionType.replace(/_/g, ' ')}
                        </span>
                        <StatusBadge
                          variant={
                            action.status === 'completed'
                              ? 'completed'
                              : action.status === 'failed'
                                ? 'failed'
                                : action.status === 'simulation_passed'
                                  ? 'certified'
                                  : action.status === 'simulation_failed'
                                    ? 'error'
                                    : 'info'
                          }
                          label={action.status.replace(/_/g, ' ')}
                        />
                      </div>
                      {action.targetEntityType && (
                        <div className="text-[10px] text-[var(--text-muted)]">
                          Target: {action.targetEntityType}
                          {action.targetEntityId && ` (${action.targetEntityId.slice(0, 8)}...)`}
                        </div>
                      )}
                      {action.errorMessage && (
                        <div className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                          {action.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DrawerIdField label="Intent ID" value={selectedIntent.id} />
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
