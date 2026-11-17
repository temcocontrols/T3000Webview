/**
 * The report feature's routes.
 *
 * Kept as strings plus hash helpers so the application menu (which is plain data, evaluated
 * outside the report layout) can open the same pages without importing React Router.
 */

export const REPORT_FORM_HASH = '#/t3000/report';
export const REPORT_HISTORY_HASH = '#/t3000/report/history';

export function openReportForm(): void {
  window.location.hash = REPORT_FORM_HASH;
}

export function openReportHistory(): void {
  window.location.hash = REPORT_HISTORY_HASH;
}
