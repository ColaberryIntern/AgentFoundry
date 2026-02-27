import type { AgentMetrics } from '../../types/agents';

interface AgentMetricsChartProps {
  metrics: AgentMetrics;
}

function AgentMetricsChart({ metrics }: AgentMetricsChartProps) {
  const { requests, errors, avg_latency, uptime } = metrics.metrics;

  const errorRate = requests > 0 ? ((errors / requests) * 100).toFixed(2) : '0.00';

  const metricsCards = [
    {
      label: 'Total Requests',
      value: requests.toLocaleString(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Errors',
      value: errors.toLocaleString(),
      subtitle: `${errorRate}% error rate`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      ),
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/30',
    },
    {
      label: 'Avg Latency',
      value: `${avg_latency.toFixed(1)}ms`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    },
    {
      label: 'Uptime',
      value: `${uptime.toFixed(1)}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/30',
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Performance Metrics
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {metricsCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-lg p-3`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={card.color}>{card.icon}</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {card.label}
              </span>
            </div>
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Drift Analysis */}
      {metrics.driftAnalysis && !('error' in metrics.driftAnalysis) && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Drift Analysis
          </h4>
          <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
            {JSON.stringify(metrics.driftAnalysis, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default AgentMetricsChart;
