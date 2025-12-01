/**
 * Components Index
 *
 * Re-exports all shared components for easier imports
 * All components now live in shared/components/
 */

// Core shared components
export { DataTable } from '../shared/components/DataTable';
export type { Column } from '../shared/components/DataTable';
export { StatusBar } from '../shared/components/StatusBar';
export { PointEditor } from '../shared/components/PointEditor';
export { SearchBox } from '../shared/components/SearchBox';
export { NotificationProvider, useNotification } from '../shared/components/NotificationCenter';
export type { NotificationType, Notification } from '../shared/components/NotificationCenter';
export { LoadingSpinner } from '../shared/components/LoadingSpinner';
export { ErrorBoundary } from '../shared/components/ErrorBoundary';
export { ConfirmDialog } from '../shared/components/ConfirmDialog';
export { EmptyState } from '../shared/components/EmptyState';
export { GlobalMessageBar } from '../shared/components/GlobalMessageBar';
export type { GlobalMessage } from '../shared/components/GlobalMessageBar';

// Feature-specific components
export { ChartComponent } from '../features/trendlogs/components/ChartComponent';
export type { ChartDataSeries } from '../features/trendlogs/components/ChartComponent';

