import DOMPurify from 'dompurify';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchRegulatoryPredictions } from '../../store/recommendationsSlice';
import type { RegulatoryPrediction } from '../../types/recommendations';

const IMPACT_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

function likelihoodColor(likelihood: number): string {
  if (likelihood >= 0.8) return 'bg-red-500';
  if (likelihood >= 0.6) return 'bg-orange-500';
  if (likelihood >= 0.4) return 'bg-yellow-500';
  return 'bg-green-500';
}

function PredictionItem({ prediction }: { prediction: RegulatoryPrediction }) {
  const likelihoodPercent = Math.round(prediction.likelihood * 100);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${IMPACT_STYLES[prediction.impact] || ''}`}
        >
          {prediction.impact.charAt(0).toUpperCase() + prediction.impact.slice(1)} Impact
        </span>
        {prediction.category && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {prediction.category}
          </span>
        )}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {prediction.timeframe}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {DOMPurify.sanitize(prediction.title)}
      </h4>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Regulation: {DOMPurify.sanitize(prediction.regulation)}
      </p>

      <p
        className="text-sm text-gray-600 dark:text-gray-400 mb-3"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prediction.description) }}
      />

      {/* Likelihood bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Likelihood</span>
          <span>{likelihoodPercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${likelihoodColor(prediction.likelihood)}`}
            style={{ width: `${likelihoodPercent}%` }}
          />
        </div>
      </div>

      {prediction.source && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Source: {DOMPurify.sanitize(prediction.source)}
        </p>
      )}
    </div>
  );
}

function RegulatoryPredictions() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { regulatoryPredictions, predictionsLoading, error } = useAppSelector(
    (state) => state.recommendations,
  );

  const handleGetPredictions = () => {
    if (user) {
      dispatch(fetchRegulatoryPredictions(String(user.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Regulatory Predictions
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            AI-predicted regulatory changes that may impact your organization
          </p>
        </div>
        <button
          onClick={handleGetPredictions}
          disabled={predictionsLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          {predictionsLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading...
            </span>
          ) : (
            'Get Predictions'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {predictionsLoading && regulatoryPredictions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Fetching regulatory predictions...
          </p>
        </div>
      )}

      {!predictionsLoading && regulatoryPredictions.length === 0 && (
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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No predictions available yet. Click "Get Predictions" to generate them.
          </p>
        </div>
      )}

      {regulatoryPredictions.length > 0 && (
        <div className="space-y-3">
          {regulatoryPredictions.map((prediction) => (
            <PredictionItem key={prediction.id} prediction={prediction} />
          ))}
        </div>
      )}
    </div>
  );
}

export default RegulatoryPredictions;
