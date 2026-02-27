import { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { useNPSSurvey } from '../hooks/useNPSSurvey';
import { feedbackApi } from '../services/feedbackApi';

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function scoreColor(score: number, selected: boolean): string {
  if (!selected)
    return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600';
  if (score <= 6) return 'bg-red-500 text-white';
  if (score <= 8) return 'bg-yellow-500 text-white';
  return 'bg-green-500 text-white';
}

function NPSSurvey() {
  const { user } = useAppSelector((state) => state.auth);
  const { showSurvey, complete, dismiss, dismissPermanently } = useNPSSurvey();

  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show for logged-in users when the hook says it is time
  if (!user || !showSurvey) return null;

  const handleSubmit = async () => {
    if (score === null || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await feedbackApi.submit({
        category: 'other',
        message: `NPS Score: ${score}${feedback.trim() ? ` — ${feedback.trim()}` : ''}`,
        rating: Math.round((score / 10) * 5) || 1, // Map 0-10 to 1-5
        page: '/nps-survey',
      });

      setSubmitted(true);
      // Auto-close after a brief pause
      setTimeout(() => {
        complete();
      }, 2500);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Close / Dismiss button */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close NPS survey"
          className="absolute top-3 right-3 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {submitted ? (
          /* ---------- Success state ---------- */
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Thank you!</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your feedback helps us improve Agent Foundry.
            </p>
          </div>
        ) : (
          /* ---------- Survey form ---------- */
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-8">
              How likely are you to recommend Agent Foundry?
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">On a scale of 0 to 10</p>

            {/* Score buttons */}
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              {SCORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScore(s)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${scoreColor(s, score === s)}`}
                  aria-label={`Score ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-gray-500 px-1">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>

            {/* Optional text feedback */}
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
              placeholder="Any additional feedback? (optional)"
              rows={3}
              className="mt-4 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />

            {/* Error message */}
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={dismissPermanently}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Don&apos;t ask again
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={score === null || submitting}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default NPSSurvey;
