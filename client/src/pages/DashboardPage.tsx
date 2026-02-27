import { useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDashboard } from '../store/dashboardSlice';
import { useAnalytics } from '../hooks/useAnalytics';
import { useDashboardWebSocket } from '../hooks/useDashboardWebSocket';
import MetricsCards from '../components/dashboard/MetricsCards';
import ComplianceOverview from '../components/dashboard/ComplianceOverview';
import ComplianceTrend from '../components/dashboard/ComplianceTrend';
import RecentActivity from '../components/dashboard/RecentActivity';
import LiveActivityFeed from '../components/dashboard/LiveActivityFeed';

function DashboardPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { dashboard, isLoading, error } = useAppSelector((state) => state.dashboard);
  const { trackPageView } = useAnalytics();
  const { isConnected, latestMetrics, latestActivity } = useDashboardWebSocket();

  useEffect(() => {
    trackPageView('dashboard');
  }, [trackPageView]);

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboard());
    }
  }, [dispatch, user]);

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
    </div>
  );
}

export default DashboardPage;
