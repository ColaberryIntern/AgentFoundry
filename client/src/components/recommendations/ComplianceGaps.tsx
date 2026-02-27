import DOMPurify from 'dompurify';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { analyzeCompliance } from '../../store/recommendationsSlice';
import type { ComplianceGap } from '../../types/recommendations';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

function GapItem({ gap }: { gap: ComplianceGap }) {
  const confidencePercent = Math.round(gap.confidence * 100);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_STYLES[gap.severity] || ''}`}
        >
          {gap.severity.charAt(0).toUpperCase() + gap.severity.slice(1)}
        </span>
        {gap.category && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {gap.category}
          </span>
        )}
        {gap.regulation && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            {gap.regulation}
          </span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          Confidence: {confidencePercent}%
        </span>
      </div>

      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {DOMPurify.sanitize(gap.title)}
      </h4>

      <p
        className="text-sm text-gray-600 dark:text-gray-400 mb-2"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(gap.description) }}
      />

      {gap.suggestedAction && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-md border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-0.5">
            Suggested Action
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {DOMPurify.sanitize(gap.suggestedAction)}
          </p>
        </div>
      )}
    </div>
  );
}

function ComplianceGaps() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { complianceGaps, analysisLoading, error } = useAppSelector(
    (state) => state.recommendations,
  );

  const handleAnalyze = () => {
    if (user) {
      dispatch(analyzeCompliance(String(user.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Compliance Gap Analysis
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            AI-powered detection of compliance gaps in your organization
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analysisLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          {analysisLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </span>
          ) : (
            'Run Analysis'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {analysisLoading && complianceGaps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Running compliance gap analysis...
          </p>
        </div>
      )}

      {!analysisLoading && complianceGaps.length === 0 && (
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
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No compliance gaps detected yet. Click "Run Analysis" to start.
          </p>
        </div>
      )}

      {complianceGaps.length > 0 && (
        <div className="space-y-3">
          {complianceGaps.map((gap) => (
            <GapItem key={gap.id} gap={gap} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ComplianceGaps;
