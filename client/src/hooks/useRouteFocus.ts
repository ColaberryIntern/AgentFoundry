import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * After every route change, move focus to the first <h1> on the page.
 * This improves screen-reader and keyboard navigation UX by announcing
 * the new page context immediately after a client-side navigation.
 */
export function useRouteFocus(): void {
  const location = useLocation();

  useEffect(() => {
    // Small delay allows the new page component to render before we query the DOM
    const timer = setTimeout(() => {
      const heading = document.querySelector('h1');
      if (heading) {
        // Make the heading programmatically focusable if it isn't already
        if (!heading.hasAttribute('tabindex')) {
          heading.setAttribute('tabindex', '-1');
        }
        heading.focus({ preventScroll: false });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
