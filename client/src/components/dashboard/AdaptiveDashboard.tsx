import { useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import MetricsCards from './MetricsCards';
import ComplianceOverview from './ComplianceOverview';
import ComplianceTrend from './ComplianceTrend';
import RecentActivity from './RecentActivity';
import LiveActivityFeed from './LiveActivityFeed';
import RecommendationCard from '../recommendations/RecommendationCard';
import type { DashboardData } from '../../services/dashboardApi';
import type { Recommendation, FeedbackAction } from '../../types/recommendations';
import type { ActivityUpdate } from '../../types/reports';
import type { InferenceHealthResponse } from '../../types/recommendations';

const DEFAULT_LAYOUT = [
  'metrics_cards',
  'compliance_overview',
  'compliance_trend',
  'live_feed',
  'recent_activity',
  'ai_recommendations',
];

interface AdaptiveDashboardProps {
  dashboard: DashboardData;
  recommendations: Recommendation[];
  inferenceHealth: InferenceHealthResponse | null;
  latestActivity: ActivityUpdate | null;
  isConnected: boolean;
  onRecommendationFeedback: (id: string, action: FeedbackAction) => void;
  onWidgetClick?: (widgetName: string) => void;
}

function AdaptiveDashboard({
  dashboard,
  recommendations,
  inferenceHealth,
  latestActivity,
  isConnected,
  onRecommendationFeedback,
  onWidgetClick,
}: AdaptiveDashboardProps) {
  const { preferences } = useAppSelector((state) => state.adaptive);

  const layout = useMemo(() => {
    if (preferences?.dashboardLayout && preferences.dashboardLayout.length > 0) {
      return preferences.dashboardLayout;
    }
    return DEFAULT_LAYOUT;
  }, [preferences]);

  const isAdaptive = Boolean(
    preferences?.dashboardLayout && preferences.dashboardLayout.length > 0,
  );

  const handleWidgetClick = useCallback(
    (widgetName: string) => {
      onWidgetClick?.(widgetName);
    },
    [onWidgetClick],
  );

  const renderWidget = (key: string) => {
    switch (key) {
      case 'metrics_cards':
        return (
          <div key={key} onClick={() => handleWidgetClick('metrics_cards')}>
            <MetricsCards dashboard={dashboard} />
          </div>
        );
      case 'compliance_overview':
        return (
          <div key={key} onClick={() => handleWidgetClick('compliance_overview')}>
            <ComplianceOverview records={dashboard.recentUpdates} />
          </div>
        );
      case 'compliance_trend':
        return (
          <div key={key} onClick={() => handleWidgetClick('compliance_trend')}>
            <ComplianceTrend trend={dashboard.trend} />
          </div>
        );
      case 'recent_activity':
        return (
          <div key={key} onClick={() => handleWidgetClick('recent_activity')}>
            <RecentActivity records={dashboard.recentUpdates} />
          </div>
        );
      case 'live_feed':
        return (
          <div key={key} onClick={() => handleWidgetClick('live_feed')}>
            <LiveActivityFeed latestActivity={latestActivity} isConnected={isConnected} />
          </div>
        );
      case 'ai_recommendations':
        return (
          <div
            key={key}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5"
            onClick={() => handleWidgetClick('ai_recommendations')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  AI Recommendations
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      inferenceHealth?.status === 'healthy'
                        ? 'bg-green-500'
                        : inferenceHealth?.status === 'degraded'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <span className="text-gray-600 dark:text-gray-400">
                    {inferenceHealth?.status === 'healthy'
                      ? 'Online'
                      : inferenceHealth?.status === 'degraded'
                        ? 'Degraded'
                        : 'Offline'}
                  </span>
                </span>
              </div>
              <Link
                to="/recommendations"
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                View All &rarr;
              </Link>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommendations.slice(0, 5).map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onFeedback={onRecommendationFeedback}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No active recommendations at this time.
                </p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Group charts and feeds into pairs for grid layout
  const chartKeys = ['compliance_overview', 'compliance_trend'];
  const feedKeys = ['live_feed', 'recent_activity'];

  const renderedWidgets: React.ReactNode[] = [];
  let i = 0;
  while (i < layout.length) {
    const key = layout[i];

    // Pair chart widgets into a 2-column grid
    if (chartKeys.includes(key)) {
      const nextKey = i + 1 < layout.length ? layout[i + 1] : null;
      if (nextKey && chartKeys.includes(nextKey)) {
        renderedWidgets.push(
          <div key={`grid-${key}-${nextKey}`} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderWidget(key)}
            {renderWidget(nextKey)}
          </div>,
        );
        i += 2;
        continue;
      }
    }

    // Pair feed widgets into a 2-column grid
    if (feedKeys.includes(key)) {
      const nextKey = i + 1 < layout.length ? layout[i + 1] : null;
      if (nextKey && feedKeys.includes(nextKey)) {
        renderedWidgets.push(
          <div key={`grid-${key}-${nextKey}`} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderWidget(key)}
            {renderWidget(nextKey)}
          </div>,
        );
        i += 2;
        continue;
      }
    }

    // Render single widget
    renderedWidgets.push(renderWidget(key));
    i++;
  }

  return (
    <div className="space-y-6">
      {/* Personalized indicator */}
      {isAdaptive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30 rounded-lg">
          <svg
            className="w-4 h-4 text-primary-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-primary-700 dark:text-primary-400 font-medium">
            Personalized for you
          </span>
        </div>
      )}

      {renderedWidgets}
    </div>
  );
}

export default AdaptiveDashboard;
