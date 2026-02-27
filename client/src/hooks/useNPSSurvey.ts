import { useState, useCallback, useEffect } from 'react';

const NPS_FIRST_LOGIN_KEY = 'nps_first_login';
const NPS_COMPLETED_KEY = 'nps_completed';
const NPS_DISMISSED_KEY = 'nps_dismissed';

/** Number of days after first login before showing the NPS survey */
const SHOW_AFTER_DAYS = 7;

/**
 * Hook to manage NPS (Net Promoter Score) survey display logic.
 *
 * Checks localStorage for:
 * - `nps_first_login` — timestamp of first login (set on mount if absent)
 * - `nps_completed` — whether the user already submitted the survey
 * - `nps_dismissed` — whether the user chose "Don't ask again"
 *
 * Returns `showSurvey` (boolean) and functions to `complete` / `dismiss` it.
 */
export function useNPSSurvey() {
  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    // Already completed or permanently dismissed
    if (localStorage.getItem(NPS_COMPLETED_KEY) === 'true') return;
    if (localStorage.getItem(NPS_DISMISSED_KEY) === 'true') return;

    // Record first login timestamp if not already set
    let firstLogin = localStorage.getItem(NPS_FIRST_LOGIN_KEY);
    if (!firstLogin) {
      firstLogin = Date.now().toString();
      localStorage.setItem(NPS_FIRST_LOGIN_KEY, firstLogin);
    }

    const elapsed = Date.now() - Number(firstLogin);
    const requiredMs = SHOW_AFTER_DAYS * 24 * 60 * 60 * 1000;

    if (elapsed >= requiredMs) {
      setShowSurvey(true);
    }
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem(NPS_COMPLETED_KEY, 'true');
    setShowSurvey(false);
  }, []);

  const dismiss = useCallback(() => {
    setShowSurvey(false);
  }, []);

  const dismissPermanently = useCallback(() => {
    localStorage.setItem(NPS_DISMISSED_KEY, 'true');
    setShowSurvey(false);
  }, []);

  return { showSurvey, complete, dismiss, dismissPermanently };
}
