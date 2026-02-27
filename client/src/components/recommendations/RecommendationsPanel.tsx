import { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchRecommendations, submitFeedback } from '../../store/recommendationsSlice';
import type {
  RecommendationType,
  RecommendationStatus,
  RecommendationSeverity,
  FeedbackAction,
} from '../../types/recommendations';
import RecommendationCard from './RecommendationCard';
import ComplianceGaps from './ComplianceGaps';
import RegulatoryPredictions from './RegulatoryPredictions';

type TabId = 'all' | 'compliance' | 'predictions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All Recommendations' },
  { id: 'compliance', label: 'Compliance Gaps' },
  { id: 'predictions', label: 'Regulatory Predictions' },
];

const TYPE_OPTIONS: { value: RecommendationType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'compliance_gap', label: 'Compliance Gap' },
  { value: 'regulatory_prediction', label: 'Regulatory Prediction' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'risk_alert', label: 'Risk Alert' },
];

const STATUS_OPTIONS: { value: RecommendationStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'expired', label: 'Expired' },
];

const SEVERITY_OPTIONS: { value: RecommendationSeverity | ''; label: string }[] = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function RecommendationsPanel() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { recommendations, loading, error, pagination } = useAppSelector(
    (state) => state.recommendations,
  );

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [typeFilter, setTypeFilter] = useState<RecommendationType | ''>('');
  const [statusFilter, setStatusFilter] = useState<RecommendationStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<RecommendationSeverity | ''>('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadRecommendations = useCallback(() => {
    const params: Record<string, string | number> = {
      page: currentPage,
      limit: 10,
    };
    if (user) params.userId = String(user.id);
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    dispatch(fetchRecommendations(params));
  }, [dispatch, user, typeFilter, statusFilter, currentPage]);

  useEffect(() => {
    if (activeTab === 'all') {
      loadRecommendations();
    }
  }, [activeTab, loadRecommendations]);

  const handleFeedback = useCallback(
    (recommendationId: string, action: FeedbackAction) => {
      dispatch(submitFeedback({ recommendationId, action }));
    },
    [dispatch],
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Filter by severity client-side (API may not support it directly)
  const filteredRecommendations = severityFilter
    ? recommendations.filter((r) => r.severity === severityFilter)
    : recommendations;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* All Recommendations Tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as RecommendationType | '');
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as RecommendationStatus | '');
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as RecommendationSeverity | '');
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Loading recommendations...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredRecommendations.length === 0 && (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <svg
                className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3"
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
                No recommendations found matching your filters.
              </p>
            </div>
          )}

          {/* Recommendation cards */}
          {!loading && filteredRecommendations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} onFeedback={handleFeedback} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compliance Gaps Tab */}
      {activeTab === 'compliance' && <ComplianceGaps />}

      {/* Regulatory Predictions Tab */}
      {activeTab === 'predictions' && <RegulatoryPredictions />}
    </div>
  );
}

export default RecommendationsPanel;
