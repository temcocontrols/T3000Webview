/**
 * Components Index
 *
 * Re-exports common components for backward compatibility
 * Note: Most components have been moved to shared/ or features/ folders
 */

// Legacy components still in use
export { DataTable } from './DataTable';
export type { Column } from './DataTable';
export { StatusBar } from './StatusBar';
export { PointEditor } from './PointEditor';
export { SearchBox } from './SearchBox';
export { NotificationProvider, useNotification } from './NotificationCenter';
export type { NotificationType, Notification } from './NotificationCenter';

// Re-export from new locations for backward compatibility
export { LoadingSpinner } from '../shared/components/LoadingSpinner';
export { ErrorBoundary } from '../shared/components/ErrorBoundary';
export { ConfirmDialog } from '../shared/components/ConfirmDialog';
export { EmptyState } from '../shared/components/EmptyState';
export { GlobalMessageBar } from '../shared/components/GlobalMessageBar';
export type { GlobalMessage } from '../shared/components/GlobalMessageBar';
export { ChartComponent } from '../features/trends/components/ChartComponent';
export type { ChartDataSeries } from '../features/trends/components/ChartComponent';

