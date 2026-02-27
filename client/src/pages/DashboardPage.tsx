import { useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDashboard } from '../store/dashboardSlice';
import {
  fetchRecommendations,
  fetchInferenceHealth,
  submitFeedback,
} from '../store/recommendationsSlice';
import { fetchAdaptivePreferences } from '../store/adaptiveSlice';
import { useAnalytics } from '../hooks/useAnalytics';
import { useInteractionTracking } from '../hooks/useInteractionTracking';
import { useDashboardWebSocket } from '../hooks/useDashboardWebSocket';
import AdaptiveDashboard from '../components/dashboard/AdaptiveDashboard';
import type { FeedbackAction } from '../types/recommendations';

function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { dashboard, isLoading, error } = useAppSelector((state) => state.dashboard);
  const { recommendations, inferenceHealth } = useAppSelector((state) => state.recommendations);
  const { preferences } = useAppSelector((state) => state.adaptive);
  const { trackPageView } = useAnalytics();
  const { trackWidgetClick, trackRecommendationClick } = useInteractionTracking('dashboard');
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
      dispatch(fetchAdaptivePreferences(String(user.id)));
    }
  }, [dispatch, user]);

  const handleRecommendationFeedback = useCallback(
    (recommendationId: string, action: FeedbackAction) => {
      trackRecommendationClick(recommendationId);
      dispatch(submitFeedback({ recommendationId, action }));
    },
    [dispatch, trackRecommendationClick],
  );

  const handleWidgetClick = useCallback(
    (widgetName: string) => {
      trackWidgetClick(widgetName);
    },
    [trackWidgetClick],
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
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-800 dark:text-red-400 font-medium">{t('error.title')}</p>
          <p className="text-red-600 dark:text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={() => dispatch(fetchDashboard())}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!liveDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 dark:text-gray-500">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        {/* Live indicator */}
        {isConnected && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            {t('live')}
          </span>
        )}
      </div>

      {/* Adaptive Dashboard renders widgets in personalized order */}
      <AdaptiveDashboard
        dashboard={liveDashboard}
        recommendations={recommendations}
        inferenceHealth={inferenceHealth}
        latestActivity={latestActivity}
        isConnected={isConnected}
        onRecommendationFeedback={handleRecommendationFeedback}
        onWidgetClick={handleWidgetClick}
      />

      {/* Preferred compliance areas & Top features sidebar */}
      {preferences && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preferred Compliance Areas */}
          {preferences.preferredComplianceAreas.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('sections.preferredAreas')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {preferences.preferredComplianceAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top Features */}
          {preferences.topFeatures.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {t('sections.topFeatures')}
              </h3>
              <div className="space-y-2">
                {preferences.topFeatures.slice(0, 5).map((feature) => (
                  <div key={feature.name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                      {feature.name}
                    </span>
                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${Math.min(feature.score * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                      {Math.round(feature.score * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
