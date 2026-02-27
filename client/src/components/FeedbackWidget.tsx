import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { useAnalytics } from '../hooks/useAnalytics';
import { feedbackApi, type FeedbackPayload } from '../services/feedbackApi';

type Category = FeedbackPayload['category'];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'usability', label: 'Usability' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
];

const MAX_MESSAGE_LENGTH = 2000;

function FeedbackWidget() {
  const { user } = useAppSelector((state) => state.auth);
  const { trackEvent } = useAnalytics();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category>('bug');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Cleanup success timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const resetForm = useCallback(() => {
    setCategory('bug');
    setMessage('');
    setRating(0);
    setHoveredStar(0);
    setError(null);
    setSubmitted(false);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        // Closing — reset after transition
        setTimeout(resetForm, 200);
      }
      return !prev;
    });
  }, [resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: FeedbackPayload = {
        category,
        message: message.trim(),
        page: location.pathname,
      };
      if (rating > 0) {
        payload.rating = rating;
      }

      await feedbackApi.submit(payload);

      trackEvent('feedback_submitted', {
        category,
        rating: rating || undefined,
        page: location.pathname,
        messageLength: message.trim().length,
      });

      setSubmitted(true);
      successTimerRef.current = setTimeout(() => {
        setIsOpen(false);
        setTimeout(resetForm, 200);
      }, 3000);
    } catch {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Only render for logged-in users
  if (!user) return null;

  return (
    <>
      {/* Floating feedback button */}
      <button
        onClick={handleToggle}
        aria-label={isOpen ? 'Close feedback form' : 'Send feedback'}
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-400 rotate-90'
            : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 hover:scale-110'
        }`}
      >
        {isOpen ? (
          // X icon when open
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          // Speech bubble icon when closed
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Feedback panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-20 right-6 z-40 w-80 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-200 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
        }`}
        role="dialog"
        aria-label="Feedback form"
      >
        {submitted ? (
          /* Success state */
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
              Your feedback has been submitted.
            </p>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Send Feedback</h3>
              <button
                type="button"
                onClick={handleToggle}
                aria-label="Close feedback form"
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Category select */}
              <div>
                <label
                  htmlFor="feedback-category"
                  className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Category
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message textarea */}
              <div>
                <label
                  htmlFor="feedback-message"
                  className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Message
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  placeholder="Tell us what's on your mind..."
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <div className="mt-0.5 text-right text-xs text-gray-400 dark:text-gray-500">
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </div>
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rating{' '}
                  <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= (hoveredStar || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star === rating ? 0 : star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        className="p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded"
                      >
                        <svg
                          className={`w-6 h-6 transition-colors ${
                            filled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                          }`}
                          fill={filled ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error message */}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!message.trim() || submitting}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

export default FeedbackWidget;
