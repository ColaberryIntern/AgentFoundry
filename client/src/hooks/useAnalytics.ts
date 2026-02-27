import { useCallback } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import { useAppSelector } from '../store/hooks';

export function useAnalytics() {
  const { user } = useAppSelector((state) => state.auth);

  const trackEvent = useCallback(
    (eventType: string, eventData?: Record<string, unknown>) => {
      if (!user) return;
      // Fire and forget — don't block UI
      analyticsApi.trackEvent(eventType, eventData).catch(() => {});
    },
    [user],
  );

  const trackPageView = useCallback(
    (pageName: string) => {
      trackEvent('page_view', { page: pageName });
    },
    [trackEvent],
  );

  const trackFeatureUse = useCallback(
    (featureName: string, details?: Record<string, unknown>) => {
      trackEvent('feature_use', { feature: featureName, ...details });
    },
    [trackEvent],
  );

  return { trackEvent, trackPageView, trackFeatureUse };
}
