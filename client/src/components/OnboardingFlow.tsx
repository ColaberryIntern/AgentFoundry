import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchOnboarding, advanceOnboardingStep, skipOnboarding } from '../store/onboardingSlice';
import { useAnalytics } from '../hooks/useAnalytics';

/* ------------------------------------------------------------------ */
/* Step definitions                                                    */
/* ------------------------------------------------------------------ */

interface StepDef {
  title: string;
  description: string;
  content: React.ReactNode;
}

function WelcomeContent() {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-primary-600 dark:text-primary-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
        Agent Foundry helps you monitor compliance, generate reports, and stay on top of regulatory
        requirements -- all in one place. This quick tour will walk you through the key features.
      </p>
    </div>
  );
}

function DashboardTourContent() {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        Your dashboard gives you a real-time overview of compliance health across your organization.
      </p>
      {/* Mini mockup */}
      <div className="grid grid-cols-3 gap-3">
        {['Total Checks', 'Compliant', 'Alerts'].map((label) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
            <div className="h-6 w-12 mx-auto rounded bg-primary-200 dark:bg-primary-800 mb-2" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-3" />
          <div className="h-20 bg-gradient-to-t from-primary-100 to-transparent dark:from-primary-900/30 rounded" />
        </div>
        <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded mb-3" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-gray-600 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceCheckContent({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        Compliance checks track the regulatory status of your operations. The dashboard highlights
        any items that need attention so nothing falls through the cracks.
      </p>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Compliance checks run automatically
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            View results on your dashboard in real time
          </p>
        </div>
      </div>
      <button
        onClick={onNavigate}
        className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
      >
        Try it -- go to Dashboard
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function ReportContent({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        Generate detailed compliance reports in PDF or CSV format. Reports can be downloaded and
        shared with auditors, executives, or regulatory bodies.
      </p>
      <div className="flex gap-3">
        {['PDF', 'CSV'].map((fmt) => (
          <div
            key={fmt}
            className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center"
          >
            <div className="mx-auto w-10 h-12 rounded bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center mb-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase">
                {fmt}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {fmt === 'PDF' ? 'Rich formatted reports' : 'Data for analysis'}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={onNavigate}
        className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
      >
        Go to Reports
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function NotificationContent() {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        Stay informed with real-time notifications for compliance alerts, report completions, role
        changes, and system events. You can manage and review all notifications from the dedicated
        page.
      </p>
      <div className="space-y-2">
        {[
          { label: 'Compliance Alert', color: 'red' },
          { label: 'Report Ready', color: 'green' },
          { label: 'System Update', color: 'blue' },
        ].map((n) => (
          <div
            key={n.label}
            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                n.color === 'red'
                  ? 'bg-red-500'
                  : n.color === 'green'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
              }`}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchContent() {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        Quickly find compliance records and reports using the powerful search. Filter by type,
        status, and date range to narrow results instantly.
      </p>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-sm text-gray-400 dark:text-gray-500 flex-1">
            Search compliance records...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-medium text-gray-500 dark:text-gray-400">
            Ctrl+K
          </kbd>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Press{' '}
          <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-[10px] font-medium">
            Ctrl+K
          </kbd>{' '}
          anywhere to open the global search
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step indicator                                                      */
/* ------------------------------------------------------------------ */

function StepIndicator({
  total,
  current,
  completed,
}: {
  total: number;
  current: number;
  completed: number[];
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = completed.includes(stepNum);
        const isCurrent = stepNum === current;

        return (
          <div key={stepNum} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                isCurrent
                  ? 'bg-primary-600 text-white ring-2 ring-primary-300 dark:ring-primary-700'
                  : isCompleted
                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                stepNum
              )}
            </div>
            {i < total - 1 && (
              <div
                className={`w-6 h-0.5 mx-0.5 transition-colors ${
                  isCompleted
                    ? 'bg-primary-300 dark:bg-primary-700'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 6;

function OnboardingFlow() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { user } = useAppSelector((state) => state.auth);
  const { progress, isLoading } = useAppSelector((state) => state.onboarding);

  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Fetch onboarding progress when user is logged in
  useEffect(() => {
    if (user) {
      dispatch(fetchOnboarding());
    }
  }, [dispatch, user]);

  // Show/hide overlay based on progress
  useEffect(() => {
    if (progress && !progress.isComplete && user) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [progress, user]);

  const currentStep = progress?.currentStep ?? 1;
  const completedSteps = progress?.completedSteps ?? [];

  const handleNext = useCallback(() => {
    if (isLoading || animating) return;

    setAnimating(true);
    trackEvent('onboarding_step_complete', { step: currentStep });

    if (currentStep >= TOTAL_STEPS) {
      // Complete -- advance last step then close
      dispatch(advanceOnboardingStep(currentStep)).then(() => {
        setVisible(false);
        trackEvent('onboarding_completed');
      });
    } else {
      dispatch(advanceOnboardingStep(currentStep));
    }

    // Allow animation to settle
    setTimeout(() => setAnimating(false), 300);
  }, [dispatch, currentStep, isLoading, animating, trackEvent]);

  const handleSkip = useCallback(() => {
    trackEvent('onboarding_skipped', { atStep: currentStep });
    dispatch(skipOnboarding()).then(() => {
      setVisible(false);
    });
  }, [dispatch, currentStep, trackEvent]);

  const handleNavigateTo = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  // Build step definitions (some need navigation callbacks)
  const steps: StepDef[] = [
    {
      title: 'Welcome to Agent Foundry!',
      description: "Let's get you started with a quick tour.",
      content: <WelcomeContent />,
    },
    {
      title: 'Your Dashboard',
      description:
        'See metrics cards, compliance charts, and your recent activity feed at a glance.',
      content: <DashboardTourContent />,
    },
    {
      title: 'Monitor Compliance',
      description: 'Create and track compliance checks to stay audit-ready.',
      content: <ComplianceCheckContent onNavigate={() => handleNavigateTo('/dashboard')} />,
    },
    {
      title: 'Generate Reports',
      description: 'Export compliance data as PDF or CSV for stakeholders.',
      content: <ReportContent onNavigate={() => handleNavigateTo('/reports')} />,
    },
    {
      title: 'Stay Informed',
      description: 'Get notified about compliance alerts and system events.',
      content: <NotificationContent />,
    },
    {
      title: 'Find Anything',
      description: 'Use search and filters to locate records instantly.',
      content: <SearchContent />,
    },
  ];

  if (!visible || !progress) return null;

  const step = steps[currentStep - 1];
  const isLastStep = currentStep >= TOTAL_STEPS;

  const overlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-900/60 to-primary-900/50 backdrop-blur-sm" />

      {/* Card */}
      <div
        className={`relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          animating ? 'opacity-80 scale-[0.98]' : 'opacity-100 scale-100'
        }`}
      >
        {/* Step indicator */}
        <div className="px-6 pt-6 pb-4">
          <StepIndicator total={TOTAL_STEPS} current={currentStep} completed={completedSteps} />
        </div>

        {/* Step content */}
        <div className="px-6 pb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
            {step.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-6">
            {step.description}
          </p>

          <div className="min-h-[180px]">{step.content}</div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Skip Onboarding
          </button>

          <button
            onClick={handleNext}
            disabled={isLoading}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : isLastStep ? (
              'Complete'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default OnboardingFlow;
