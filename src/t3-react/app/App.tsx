/**
 * T3000 React Application
 *
 * Main App component with routing and providers
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider, webLightTheme, webDarkTheme, Spinner } from '@fluentui/react-components';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { ThemeProvider } from '../theme/ThemeProvider';
import { NotificationProvider } from '../shared/components/NotificationCenter';
import { MainLayout } from '../layout/MainLayout';
import { MinimalLayout } from '../layout/MinimalLayout';
import styles from './App.module.css';

// Lazy load pages from features
const DashboardPage = React.lazy(() =>
  import('../features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const InputsPage = React.lazy(() =>
  import('../features/inputs/pages/InputsPage').then((m) => ({ default: m.InputsPage }))
);
const OutputsPage = React.lazy(() =>
  import('../features/outputs/pages/OutputsPage').then((m) => ({ default: m.OutputsPage }))
);
const VariablesPage = React.lazy(() =>
  import('../features/variables/pages/VariablesPage').then((m) => ({ default: m.VariablesPage }))
);
const ProgramsPage = React.lazy(() =>
  import('../features/programs/pages/ProgramsPage').then((m) => ({ default: m.ProgramsPage }))
);
const PIDLoopsPage = React.lazy(() =>
  import('../features/controllers/pages/PIDLoopsPage')
);
const GraphicsPage = React.lazy(() =>
  import('../features/graphics/pages/GraphicsPage').then((m) => ({ default: m.GraphicsPage }))
);
const SchedulesPage = React.lazy(() =>
  import('../features/schedules/pages/SchedulesPage')
);
const HolidaysPage = React.lazy(() =>
  import('../features/schedules/pages/HolidaysPage').then((m) => ({ default: m.HolidaysPage }))
);
const TrendLogsPage = React.lazy(() =>
  import('../features/trendlogs/pages/TrendLogsPage').then((m) => ({ default: m.TrendLogsPage }))
);
const AlarmsPage = React.lazy(() =>
  import('../features/alarms/pages/AlarmsPage')
);
const NetworkPage = React.lazy(() =>
  import('../features/network/pages/NetworkPage').then((m) => ({ default: m.NetworkPage }))
);
const ArrayPage = React.lazy(() =>
  import('../features/controllers/pages/ArrayPage')
);
const TablesPage = React.lazy(() =>
  import('../features/tables/pages/TablesPage').then((m) => ({ default: m.TablesPage }))
);
const UsersPage = React.lazy(() =>
  import('../features/users/pages/UsersPage').then((m) => ({ default: m.UsersPage }))
);
const CustomUnitsPage = React.lazy(() =>
  import('../features/customUnits/pages/CustomUnitsPage').then((m) => ({ default: m.CustomUnitsPage }))
);
const SettingsPage = React.lazy(() =>
  import('../features/settings/pages/SettingsPage')
);
const DiscoverPage = React.lazy(() =>
  import('../features/discover/pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage }))
);
const BuildingsPage = React.lazy(() =>
  import('../features/buildings/pages/BuildingsPage').then((m) => ({ default: m.BuildingsPage }))
);
const HvacDesignerPage = React.lazy(() =>
  import('../features/hvac-designer/pages/HvacDesignerPage').then((m) => ({ default: m.HvacDesignerPage }))
);
const DocumentationPage = React.lazy(() =>
  import('../features/documentation/pages/DocumentationPage').then((m) => ({ default: m.DocumentationPage }))
);

// Develop section - special layout
const DevelopLayoutWrapper = React.lazy(() =>
  import('../features/develop/layout/DevelopLayoutWrapper').then((m) => ({ default: m.DevelopLayoutWrapper }))
);
const DevelopLayout = React.lazy(() =>
  import('../features/develop/layout/DevelopLayout').then((m) => ({ default: m.DevelopLayout }))
);
const FileBrowserPage = React.lazy(() =>
  import('../features/develop/pages/FileBrowserPage').then((m) => ({ default: m.FileBrowserPage }))
);
const DatabaseViewerPage = React.lazy(() =>
  import('../features/develop/pages/DatabaseViewerPage').then((m) => ({ default: m.DatabaseViewerPage }))
);
const TransportTesterPage = React.lazy(() =>
  import('../features/develop/pages/TransportTesterPage').then((m) => ({ default: m.TransportTesterPage }))
);
const SystemLogsPage = React.lazy(() =>
  import('../features/develop/pages/SystemLogsPage').then((m) => ({ default: m.SystemLogsPage }))
);
const SyncConfigurationPage = React.lazy(() =>
  import('../features/system/pages/SyncConfigurationPage').then((m) => ({ default: m.SyncConfigurationPage }))
);

/**
 * Protected Route Wrapper
 * Redirects to login if not authenticated
 * TODO: Re-enable authentication after testing
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Temporarily disable authentication for testing
  // const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated);
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
};

/**
 * Main App Component
 */
export const App: React.FC = () => {
  const [theme] = React.useState<'light' | 'dark'>('light');

  console.log('🚀 React App component rendering...');

  return (
    <div className={styles.appContainer}>
      <ThemeProvider>
        <FluentProvider theme={theme === 'light' ? webLightTheme : webDarkTheme}>
          <NotificationProvider>
            <ErrorBoundary>
              <HashRouter>
              <Routes>
                  {/* T3000 Routes - All protected with MainLayout wrapper */}
                  <Route
                    path="/t3000"
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                {/* Nested routes */}
                <Route
                  index
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <DashboardPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <DashboardPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="inputs"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <InputsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="outputs"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <OutputsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="variables"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <VariablesPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="programs"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <ProgramsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="pidloops"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <PIDLoopsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="graphics"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <GraphicsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="schedules"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <SchedulesPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="holidays"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <HolidaysPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="trendlogs"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <TrendLogsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="alarms"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <AlarmsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="network"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <NetworkPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="array"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <ArrayPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="tables"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <TablesPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="users"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <UsersPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="custom-units"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <CustomUnitsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <SettingsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="discover"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <DiscoverPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="buildings"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <BuildingsPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="system/sync"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <SyncConfigurationPage />
                    </React.Suspense>
                  }
                />

                {/* Develop Routes - Special layout with left navigation */}
              </Route>

              {/* HVAC Designer & Documentation - Minimal layout with just top menu bar */}
              <Route path="/t3000" element={<MinimalLayout />}>
                <Route
                  path="hvac-designer/:graphicId?"
                  element={
                    <React.Suspense fallback={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '20px' }}>
                        <Spinner size="extra-tiny" />
                        <span style={{ fontSize: '13px' }}>Loading...</span>
                      </div>
                    }>
                      <HvacDesignerPage />
                    </React.Suspense>
                  }
                />
                <Route
                  path="documentation"
                  element={
                    <React.Suspense fallback={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                        <Spinner size="medium" />
                        <span>Loading...</span>
                      </div>
                    }>
                      <DocumentationPage />
                    </React.Suspense>
                  }
                />
              </Route>

              {/* Develop Routes - Separate from t3000, no device tree */}
              <Route
                path="/t3000/develop"
                element={
                  <ProtectedRoute>
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <DevelopLayoutWrapper />
                    </React.Suspense>
                  </ProtectedRoute>
                }
              >
                <Route
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <DevelopLayout />
                    </React.Suspense>
                  }
                >
                  <Route
                    index
                    element={<Navigate to="/t3000/develop/files" replace />}
                  />
                  <Route
                    path="files"
                    element={
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <FileBrowserPage />
                      </React.Suspense>
                    }
                  />
                  <Route
                    path="database"
                    element={
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <DatabaseViewerPage />
                      </React.Suspense>
                    }
                  />
                  <Route
                    path="transport"
                    element={
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <TransportTesterPage />
                      </React.Suspense>
                    }
                  />
                  <Route
                    path="logs"
                    element={
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <SystemLogsPage />
                      </React.Suspense>
                    }
                  />
                </Route>
              </Route>

              {/* Fallback route */}
              </Routes>
            </HashRouter>
          </ErrorBoundary>
        </NotificationProvider>
      </FluentProvider>
      </ThemeProvider>
    </div>
  );
};
