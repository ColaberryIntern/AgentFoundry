import { useEffect, useRef, useCallback } from 'react';
import { adaptiveApi } from '../services/adaptiveApi';
import type { UserInteraction } from '../types/adaptive';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const BATCH_INTERVAL_MS = 5000;

export function useInteractionTracking(pageName: string) {
  const sessionIdRef = useRef(generateUUID());
  const queueRef = useRef<UserInteraction[]>([]);
  const mountTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const flushQueue = useCallback(() => {
    if (queueRef.current.length === 0) return;
    const batch = [...queueRef.current];
    queueRef.current = [];
    adaptiveApi.trackInteractionsBatch(batch).catch(() => {
      // Fire and forget — non-blocking
    });
  }, []);

  // Track page view on mount, duration on unmount
  useEffect(() => {
    mountTimeRef.current = Date.now();

    queueRef.current.push({
      interactionType: 'page_view',
      target: pageName,
      sessionId: sessionIdRef.current,
    });

    // Set up periodic flushing
    timerRef.current = setInterval(flushQueue, BATCH_INTERVAL_MS);

    // Flush on page unload
    const handleBeforeUnload = () => {
      // Calculate duration for page view
      const duration = Math.round((Date.now() - mountTimeRef.current) / 1000);
      queueRef.current.push({
        interactionType: 'page_view',
        target: `${pageName}:duration`,
        metadata: { duration },
        sessionId: sessionIdRef.current,
        duration,
      });
      // Use sendBeacon for reliable delivery on unload
      const payload = JSON.stringify({ interactions: queueRef.current });
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/interactions/batch', blob);
      queueRef.current = [];
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Flush remaining on unmount (for SPA navigations)
      const duration = Math.round((Date.now() - mountTimeRef.current) / 1000);
      queueRef.current.push({
        interactionType: 'page_view',
        target: `${pageName}:duration`,
        metadata: { duration },
        sessionId: sessionIdRef.current,
        duration,
      });
      flushQueue();
    };
  }, [pageName, flushQueue]);

  const trackFeatureUse = useCallback((featureName: string, metadata?: Record<string, unknown>) => {
    queueRef.current.push({
      interactionType: 'feature_use',
      target: featureName,
      metadata,
      sessionId: sessionIdRef.current,
    });
  }, []);

  const trackSearch = useCallback((query: string) => {
    queueRef.current.push({
      interactionType: 'search',
      target: query,
      sessionId: sessionIdRef.current,
    });
  }, []);

  const trackWidgetClick = useCallback((widgetName: string) => {
    queueRef.current.push({
      interactionType: 'dashboard_widget_click',
      target: widgetName,
      sessionId: sessionIdRef.current,
    });
  }, []);

  const trackRecommendationClick = useCallback((recId: string) => {
    queueRef.current.push({
      interactionType: 'recommendation_click',
      target: recId,
      sessionId: sessionIdRef.current,
    });
  }, []);

  const trackReportGenerate = useCallback((reportType: string) => {
    queueRef.current.push({
      interactionType: 'report_generate',
      target: reportType,
      sessionId: sessionIdRef.current,
    });
  }, []);

  const trackFilterApply = useCallback((filterName: string, filterValue: string) => {
    queueRef.current.push({
      interactionType: 'filter_apply',
      target: filterName,
      metadata: { value: filterValue },
      sessionId: sessionIdRef.current,
    });
  }, []);

  return {
    trackFeatureUse,
    trackSearch,
    trackWidgetClick,
    trackRecommendationClick,
    trackReportGenerate,
    trackFilterApply,
  };
}
