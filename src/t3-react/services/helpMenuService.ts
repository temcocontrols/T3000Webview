/**
 * Help Menu Service
 * Handles operations from the Help menu
 */

import { reportFormHref } from '../features/report/services/reportRoutes';

/** The app uses a HashRouter, so navigating means changing the hash. */
function navigate(path: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.location.hash = `#${path}`;
}

/**
 * Show help contents/documentation
 * Opens the documentation already shipped with the app
 */
export async function showContents(): Promise<void> {
  navigate('/t3000/documentation');
}

/**
 * Report an issue
 * Opens the screenshot / self-check / report flow. The hash helper keeps the `embed` flag, so the
 * same call works from a T3000 window that was opened without the application menu.
 */
export async function showReportIssue(): Promise<void> {
  window.location.hash = reportFormHref();
}

/**
 * Show version history
 * Displays the version history and changelog
 */
export async function showVersionHistory(): Promise<void> {
  // TODO: Implement version history logic
  // This should open a dialog showing version history and changelog
}

/**
 * Show about software dialog
 * Displays information about the T3000 software
 */
export async function showAboutSoftware(): Promise<void> {
  // TODO: Implement about software logic
  // This should show a dialog with software version, license info, etc.
}

/**
 * Check for software updates
 * Checks if a newer version is available
 */
export async function checkForUpdates(): Promise<void> {
  // TODO: Implement update check logic
  // This should check for available updates and prompt user to download
}

/**
 * Help Menu Service
 */
export const HelpMenuService = {
  showContents,
  showReportIssue,
  showVersionHistory,
  showAboutSoftware,
  checkForUpdates,
};
