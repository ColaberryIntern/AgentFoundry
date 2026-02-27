import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAgentMetrics, clearMetrics } from '../../store/agentsSlice';
import type { AgentStack, AgentStackStatus, AgentHealthStatus } from '../../types/agents';
import AgentMetricsChart from './AgentMetricsChart';
import AgentOptimizePanel from './AgentOptimizePanel';

interface AgentDetailPanelProps {
  agent: AgentStack;
  onClose: () => void;
  onDeploy: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onStop: (id: string) => void;
}

const statusColors: Record<AgentStackStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  deploying: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  running: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  stopped: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const healthLabels: Record<AgentHealthStatus, { label: string; color: string }> = {
  healthy: { label: 'Healthy', color: 'text-green-600 dark:text-green-400' },
  degraded: { label: 'Degraded', color: 'text-yellow-600 dark:text-yellow-400' },
  unhealthy: { label: 'Unhealthy', color: 'text-red-600 dark:text-red-400' },
  unknown: { label: 'Unknown', color: 'text-gray-500 dark:text-gray-400' },
};

const typeLabels: Record<string, string> = {
  compliance_monitor: 'Compliance Monitor',
  risk_analyzer: 'Risk Analyzer',
  regulatory_tracker: 'Regulatory Tracker',
  audit_agent: 'Audit Agent',
  custom: 'Custom',
};

function AgentDetailPanel({
  agent,
  onClose,
  onDeploy,
  onPause,
  onResume,
  onStop,
}: AgentDetailPanelProps) {
  const dispatch = useAppDispatch();
  const { metrics, metricsLoading } = useAppSelector((state) => state.agents);

  useEffect(() => {
    dispatch(fetchAgentMetrics(agent.id));
    return () => {
      dispatch(clearMetrics());
    };
  }, [dispatch, agent.id]);

  const healthInfo = healthLabels[agent.healthStatus];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {typeLabels[agent.type]}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[agent.status]}`}
            >
              {agent.status}
            </span>
            <span className={`text-xs font-medium ${healthInfo.color}`}>{healthInfo.label}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Description */}
        {agent.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{agent.description}</p>
          </div>
        )}

        {/* Deployment info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Created
            </h3>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
              {new Date(agent.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Deployed
            </h3>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
              {agent.deployedAt ? new Date(agent.deployedAt).toLocaleDateString() : 'Not deployed'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Last Health Check
            </h3>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
              {agent.lastHealthCheck ? new Date(agent.lastHealthCheck).toLocaleString() : 'Never'}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Agent ID
            </h3>
            <p
              className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-mono truncate"
              title={agent.id}
            >
              {agent.id}
            </p>
          </div>
        </div>

        {/* Configuration */}
        {agent.configuration && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Configuration
            </h3>
            <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
              {JSON.stringify(agent.configuration, null, 2)}
            </pre>
          </div>
        )}

        {/* Metrics Chart */}
        {metricsLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : (
          metrics && <AgentMetricsChart metrics={metrics} />
        )}

        {/* Optimize Panel */}
        <AgentOptimizePanel agentId={agent.id} />

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {(agent.status === 'draft' || agent.status === 'stopped') && (
            <button
              onClick={() => onDeploy(agent.id)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
              Deploy
            </button>
          )}
          {agent.status === 'running' && (
            <button
              onClick={() => onPause(agent.id)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Pause
            </button>
          )}
          {agent.status === 'paused' && (
            <button
              onClick={() => onResume(agent.id)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
              Resume
            </button>
          )}
          {(agent.status === 'running' || agent.status === 'paused') && (
            <button
              onClick={() => onStop(agent.id)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentDetailPanel;
