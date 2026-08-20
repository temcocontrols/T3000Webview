/**
 * usePageRefresh
 *
 * Registers this page as the handler for the global "Refresh Data" toolbar
 * action. The toolbar dispatches a `t3-page-refresh` CustomEvent; the page
 * that is currently mounted (the active route) responds by calling its own
 * silent refresh handler (e.g. handleRefreshFromDevice / handleRefresh).
 *
 * This replaces the old full `window.location.reload()` so refreshing the
 * current page never flashes/reloads the whole SPA.
 *
 * Usage (inside a page component, after the handler is defined):
 *   usePageRefresh(handleRefreshFromDevice);
 */
import { useEffect } from 'react';

export const PAGE_REFRESH_EVENT = 't3-page-refresh';

export function usePageRefresh(handler: () => void | Promise<void>) {
  useEffect(() => {
    const onRefresh = () => {
      void handler();
    };
    window.addEventListener(PAGE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(PAGE_REFRESH_EVENT, onRefresh);
  }, [handler]);
}
