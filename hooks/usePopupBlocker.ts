import { useEffect } from 'react';

/**
 * A global hook to prevent unexpected top-level redirects and popups.
 * 
 * - Overrides `window.open` to block unwanted new tabs from top-level scripts.
 * - Warns the user if a cross-origin iframe attempts to navigate the top window
 *   away from the app (e.g. rogue ad redirects).
 */
export function usePopupBlocker() {
  useEffect(() => {
    // 1. Intercept top-level window.open calls
    const originalWindowOpen = window.open;
    window.open = function (...args: any[]) {
      console.warn('Blocked attempt to open a new window/tab:', args);
      // We can return null to mimic a blocked popup
      return null;
    };

    // 2. Intercept unexpected top-level redirects (hijacking)
    // We are aggressively blocking all unloads on watch pages.
    // Rogue ad scripts intentionally blur the iframe or use delayed timeouts
    // to execute redirects when the iframe is NO LONGER the active element,
    // which bypassed our previous focus check.
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // In a React SPA, legitimate navigation (like clicking 'Back' or Home)
      // DOES NOT trigger beforeunload. This event only fires on hard refresh,
      // tab close, or malicious top-level redirects.
      if (window.location.pathname.includes('/watch/')) {
        console.warn('Aggressively blocked a top-level redirect attempt.');
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.open = originalWindowOpen;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
