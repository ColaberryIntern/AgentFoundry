import { useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchInferenceHealth } from '../store/recommendationsSlice';
import { useAnalytics } from '../hooks/useAnalytics';
import { useInteractionTracking } from '../hooks/useInteractionTracking';
import RecommendationsPanel from '../components/recommendations/RecommendationsPanel';

function RecommendationsPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { inferenceHealth } = useAppSelector((state) => state.recommendations);
  const { trackPageView } = useAnalytics();
  useInteractionTracking('recommendations');

  useEffect(() => {
    trackPageView('recommendations');
  }, [trackPageView]);

  useEffect(() => {
    dispatch(fetchInferenceHealth());
  }, [dispatch]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const healthStatus = inferenceHealth?.status || 'offline';
  const healthColor =
    healthStatus === 'healthy'
      ? 'bg-green-500'
      : healthStatus === 'degraded'
        ? 'bg-yellow-500'
        : 'bg-red-500';
  const healthLabel =
    healthStatus === 'healthy' ? 'Online' : healthStatus === 'degraded' ? 'Degraded' : 'Offline';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              to="/dashboard"
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <svg
              className="w-3.5 h-3.5 inline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li className="text-gray-900 dark:text-gray-100 font-medium">AI Recommendations</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            AI Recommendations
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-powered compliance insights, gap analysis, and regulatory predictions
          </p>
        </div>
        {/* AI Service health indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <span className="text-xs text-gray-500 dark:text-gray-400">AI Service:</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${healthColor}`} />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {healthLabel}
            </span>
          </span>
        </div>
      </div>

      {/* Main content */}
      <RecommendationsPanel />
    </div>
  );
}

export default RecommendationsPage;
