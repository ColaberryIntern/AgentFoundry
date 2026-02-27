import DOMPurify from 'dompurify';
import type { Recommendation, FeedbackAction } from '../../types/recommendations';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const SEVERITY_BAR_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const TYPE_LABELS: Record<string, string> = {
  compliance_gap: 'Compliance Gap',
  regulatory_prediction: 'Regulatory Prediction',
  optimization: 'Optimization',
  risk_alert: 'Risk Alert',
};

const TYPE_STYLES: Record<string, string> = {
  compliance_gap: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  regulatory_prediction: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  optimization: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  risk_alert: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  dismissed: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  expired: 'bg-gray-100 text-gray-500 dark:bg-gray-700/30 dark:text-gray-500',
};

interface RecommendationCardProps {
  recommendation: Recommendation;
  onFeedback?: (id: string, action: FeedbackAction) => void;
  compact?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function RecommendationCard({
  recommendation,
  onFeedback,
  compact = false,
}: RecommendationCardProps) {
  const {
    id,
    title,
    description,
    type,
    severity,
    confidence,
    status,
    category,
    createdAt,
    updatedAt,
  } = recommendation;

  const sanitizedDescription = DOMPurify.sanitize(description);
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header: badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
        >
          {TYPE_LABELS[type] || type}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_STYLES[severity] || ''}`}
        >
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </span>
        {!compact && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || ''}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
        {category && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {category}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {DOMPurify.sanitize(title)}
      </h3>

      {/* Description */}
      {!compact && (
        <p
          className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />
      )}
      {compact && (
        <p
          className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2"
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />
      )}

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Confidence</span>
          <span>{confidencePercent}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${SEVERITY_BAR_COLORS[severity] || 'bg-blue-500'}`}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Timestamps */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mb-3">
          <span>Created: {formatDate(createdAt)}</span>
          <span>Updated: {formatDate(updatedAt)}</span>
        </div>
      )}

      {/* Action buttons */}
      {status === 'active' && onFeedback && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onFeedback(id, 'accept')}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => onFeedback(id, 'dismiss')}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default RecommendationCard;
