import { useEffect, useMemo, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDashboard } from '../store/dashboardSlice';
import {
  fetchRecommendations,
  fetchInferenceHealth,
  submitFeedback,
} from '../store/recommendationsSlice';
import { useAnalytics } from '../hooks/useAnalytics';
import { useDashboardWebSocket } from '../hooks/useDashboardWebSocket';
import MetricsCards from '../components/dashboard/MetricsCards';
import ComplianceOverview from '../components/dashboard/ComplianceOverview';
import ComplianceTrend from '../components/dashboard/ComplianceTrend';
import RecentActivity from '../components/dashboard/RecentActivity';
import LiveActivityFeed from '../components/dashboard/LiveActivityFeed';
import RecommendationCard from '../components/recommendations/RecommendationCard';
import type { FeedbackAction } from '../types/recommendations';

function DashboardPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { dashboard, isLoading, error } = useAppSelector((state) => state.dashboard);
  const { recommendations, inferenceHealth } = useAppSelector((state) => state.recommendations);
  const { trackPageView } = useAnalytics();
  const { isConnected, latestMetrics, latestActivity } = useDashboardWebSocket();

  useEffect(() => {
    trackPageView('dashboard');
  }, [trackPageView]);

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboard());
      dispatch(
        fetchRecommendations({
          userId: String(user.id),
          status: 'active',
          limit: 5,
        }),
      );
      dispatch(fetchInferenceHealth());
    }
  }, [dispatch, user]);

  const handleRecommendationFeedback = useCallback(
    (recommendationId: string, action: FeedbackAction) => {
      dispatch(submitFeedback({ recommendationId, action }));
    },
    [dispatch],
  );

  // Merge WebSocket metrics with dashboard data for real-time updates
  const liveDashboard = useMemo(() => {
    if (!dashboard) return null;
    if (!latestMetrics) return dashboard;
    return {
      ...dashboard,
      complianceRate: latestMetrics.complianceRate,
      openIssues: latestMetrics.openIssues,
      alertsCount: latestMetrics.alertsCount,
    };
  }, [dashboard, latestMetrics]);

  // Redirect unauthenticated users to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-800 dark:text-red-400 font-medium">Failed to load dashboard</p>
          <p className="text-red-600 dark:text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={() => dispatch(fetchDashboard())}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!liveDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 dark:text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compliance monitoring overview
          </p>
        </div>
        {/* Live indicator */}
        {isConnected && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </span>
        )}
      </div>

      {/* KPI Metrics Row */}
      <MetricsCards dashboard={liveDashboard} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceOverview records={liveDashboard.recentUpdates} />
        <ComplianceTrend trend={liveDashboard.trend} />
      </div>

      {/* Live Activity Feed + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveActivityFeed latestActivity={latestActivity} isConnected={isConnected} />
        <RecentActivity records={liveDashboard.recentUpdates} />
      </div>

      {/* AI Recommendations Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              AI Recommendations
            </h2>
            {/* AI Service health indicator */}
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
                onFeedback={handleRecommendationFeedback}
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
    </div>
  );
}

export default DashboardPage;
