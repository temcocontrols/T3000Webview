/**
 * The report feature's routes.
 *
 * Kept as strings plus hash helpers so the application menu (which is plain data, evaluated
 * outside the report layout) can open the same pages without importing React Router.
 */

export const REPORT_FORM_HASH = '#/t3000/report';
export const REPORT_HISTORY_HASH = '#/t3000/report/history';

/**
 * `?embed=1` is how the T3000 host opens the report window (menu-less shell). The flag lives in the
 * hash query, so every move between the form and the history has to carry it along — otherwise the
 * window grows the application menu bar as soon as the user clicks History.
 */
const EMBED_QUERY = 'embed=1';

function embedQuery(from: string): string {
  const query = from.indexOf('?');
  if (query < 0) {
    return '';
  }
  return new URLSearchParams(from.slice(query + 1)).get('embed') === '1' ? `?${EMBED_QUERY}` : '';
}

/** The form, keeping the current window's `embed` flag. */
export function reportFormHref(from: string = window.location.hash): string {
  return `${REPORT_FORM_HASH}${embedQuery(from)}`;
}

/** The history list, keeping the current window's `embed` flag. */
export function reportHistoryHref(from: string = window.location.hash): string {
  return `${REPORT_HISTORY_HASH}${embedQuery(from)}`;
}

export function openReportForm(): void {
  window.location.hash = reportFormHref();
}

export function openReportHistory(): void {
  window.location.hash = reportHistoryHref();
}
