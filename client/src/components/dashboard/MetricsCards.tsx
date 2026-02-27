import type { DashboardData } from '../../services/dashboardApi';

interface MetricsCardsProps {
  dashboard: DashboardData;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function complianceRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600 dark:text-green-400';
  if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function complianceRateBg(rate: number): string {
  if (rate >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (rate >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

function MetricsCards({ dashboard }: MetricsCardsProps) {
  const lastChecked =
    dashboard.recentUpdates.length > 0
      ? (dashboard.recentUpdates[0].lastChecked ?? dashboard.recentUpdates[0].updatedAt)
      : null;

  const cards = [
    {
      label: 'Compliance Rate',
      value: `${dashboard.complianceRate}%`,
      iconBg: complianceRateBg(dashboard.complianceRate),
      iconColor: complianceRateColor(dashboard.complianceRate),
      valueColor: complianceRateColor(dashboard.complianceRate),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Open Issues',
      value: dashboard.openIssues,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      valueColor:
        dashboard.openIssues > 0
          ? 'text-red-600 dark:text-red-400'
          : 'text-gray-900 dark:text-gray-100',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      ),
    },
    {
      label: 'Alerts',
      value: dashboard.alertsCount,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      valueColor:
        dashboard.alertsCount > 0
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-gray-900 dark:text-gray-100',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
    {
      label: 'Last Check',
      value: formatRelativeTime(lastChecked),
      iconBg: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
      valueColor: 'text-gray-900 dark:text-gray-100',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4"
        >
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${card.iconBg} ${card.iconColor}`}
          >
            {card.icon}
          </div>
          <div>
            <p className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MetricsCards;
