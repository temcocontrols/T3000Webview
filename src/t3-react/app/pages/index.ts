/**
 * Page Components Index
 * Central export for all feature pages
 */

// Home/Dashboard
export { HomePage } from '../../features/dashboard/pages/HomePage';
export { DashboardPage } from '../../features/dashboard/pages/DashboardPage';

// Device Points
export { InputsPage } from '../../features/inputs/pages/InputsPage';
export { OutputsPage } from '../../features/outputs/pages/OutputsPage';
export { VariablesPage } from '../../features/variables/pages/VariablesPage';

// Programming
export { ProgramsPage } from '../../features/programs/pages/ProgramsPage';
export { default as PIDLoopsPage } from '../../features/controllers/pages/PIDLoopsPage';

// Time & Scheduling
export { default as SchedulesPage } from '../../features/schedules/pages/SchedulesPage';
export { HolidaysPage } from '../../features/schedules/pages/HolidaysPage';

// Monitoring
export { TrendLogsPage } from '../../features/trendlogs/pages/TrendLogsPage';
export { TrendChartPage } from '../../features/trendlogs/pages/TrendChartPage';
export { default as AlarmsPage } from '../../features/alarms/pages/AlarmsPage';

// Configuration
export { SettingsPage } from '../../features/settings/pages/SettingsPage';
export { NetworkPage } from '../../features/network/pages/NetworkPage';
export { default as ArrayPage } from '../../features/controllers/pages/ArrayPage';

// Graphics
export { GraphicsPage } from '../../features/graphics/pages/GraphicsPage';

// Discovery
export { DiscoverPage } from '../../features/discover/pages/DiscoverPage';
export { BuildingsPage } from '../../features/buildings/pages/BuildingsPage';
