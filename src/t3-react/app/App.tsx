/**
 * T3000 React Application
 *
 * Main App component with routing and providers
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { MainLayout } from '../layout/MainLayout';

// Lazy load pages from features
const HomePage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.HomePage }))
);
const DashboardPage = React.lazy(() =>
  import('../features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const InputsPage = React.lazy(() =>
  import('../features/points/inputs/InputsPage').then((m) => ({ default: m.InputsPage }))
);
const OutputsPage = React.lazy(() =>
  import('../features/points/outputs/OutputsPage').then((m) => ({ default: m.OutputsPage }))
);
const VariablesPage = React.lazy(() =>
  import('../features/points/variables/VariablesPage').then((m) => ({ default: m.VariablesPage }))
);
const ProgramsPage = React.lazy(() =>
  import('../features/programs/pages/ProgramsPage').then((m) => ({ default: m.ProgramsPage }))
);
const ControllersPage = React.lazy(() =>
  import('../features/controllers/pages/ControllersPage').then((m) => ({ default: m.ControllersPage }))
);
const GraphicsPage = React.lazy(() =>
  import('../features/graphics/pages/GraphicsPage').then((m) => ({ default: m.GraphicsPage }))
);
const SchedulesPage = React.lazy(() =>
  import('../features/schedules/pages/SchedulesPage').then((m) => ({ default: m.SchedulesPage }))
);
const HolidaysPage = React.lazy(() =>
  import('../features/schedules/pages/HolidaysPage').then((m) => ({ default: m.HolidaysPage }))
);
const TrendLogsPage = React.lazy(() =>
  import('../features/trends/pages/TrendLogsPage').then((m) => ({ default: m.TrendLogsPage }))
);
const AlarmsPage = React.lazy(() =>
  import('../features/alarms/pages/AlarmsPage').then((m) => ({ default: m.AlarmsPage }))
);
const NetworkPage = React.lazy(() =>
  import('../features/network/pages/NetworkPage').then((m) => ({ default: m.NetworkPage }))
);
const ArrayPage = React.lazy(() =>
  import('../features/controllers/pages/ArrayPage').then((m) => ({ default: m.ArrayPage }))
);
const SettingsPage = React.lazy(() =>
  import('../features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const DiscoverPage = React.lazy(() =>
  import('../features/network/pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage }))
);
const BuildingsPage = React.lazy(() =>
  import('../features/buildings/pages/BuildingsPage').then((m) => ({ default: m.BuildingsPage }))
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
    <div style={{ width: '100%', height: '100%', minHeight: '100vh', background: '#ffffff' }}>
      <FluentProvider theme={theme === 'light' ? webLightTheme : webDarkTheme}>
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
                  path="controllers"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <ControllersPage />
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
                  path="trend-logs"
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
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/t3000" replace />} />
            </Routes>
          </HashRouter>
        </ErrorBoundary>
      </FluentProvider>
    </div>
  );
};
