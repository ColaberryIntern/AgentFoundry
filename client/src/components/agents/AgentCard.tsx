import type {
  AgentStack,
  AgentStackStatus,
  AgentStackType,
  AgentHealthStatus,
} from '../../types/agents';

interface AgentCardProps {
  agent: AgentStack;
  onSelect: (agent: AgentStack) => void;
  onDeploy: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<AgentStackStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  deploying: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  running: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  stopped: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const typeLabels: Record<AgentStackType, string> = {
  compliance_monitor: 'Compliance Monitor',
  risk_analyzer: 'Risk Analyzer',
  regulatory_tracker: 'Regulatory Tracker',
  audit_agent: 'Audit Agent',
  custom: 'Custom',
};

const healthDotColors: Record<AgentHealthStatus, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
  unknown: 'bg-gray-400',
};

function AgentCard({
  agent,
  onSelect,
  onDeploy,
  onPause,
  onResume,
  onStop,
  onDelete,
}: AgentCardProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(agent)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(agent);
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {agent.name}
          </h3>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            {typeLabels[agent.type]}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${healthDotColors[agent.healthStatus]}`}
            title={`Health: ${agent.healthStatus}`}
          />
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[agent.status]}`}
          >
            {agent.status}
          </span>
        </div>
      </div>

      {agent.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {agent.description}
        </p>
      )}

      <div className="flex items-center gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
        {(agent.status === 'draft' || agent.status === 'stopped') && (
          <button
            onClick={() => onDeploy(agent.id)}
            className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
          >
            Deploy
          </button>
        )}
        {agent.status === 'running' && (
          <button
            onClick={() => onPause(agent.id)}
            className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Pause
          </button>
        )}
        {agent.status === 'paused' && (
          <button
            onClick={() => onResume(agent.id)}
            className="px-2.5 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
          >
            Resume
          </button>
        )}
        {(agent.status === 'running' || agent.status === 'paused') && (
          <button
            onClick={() => onStop(agent.id)}
            className="px-2.5 py-1 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            Stop
          </button>
        )}
        {(agent.status === 'draft' || agent.status === 'stopped') && (
          <button
            onClick={() => onDelete(agent.id)}
            className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded transition-colors dark:text-red-400 dark:border-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default AgentCard;
