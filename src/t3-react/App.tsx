/**
 * T3000 React Application
 *
 * Main App component with routing and providers
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { ErrorBoundary, NotificationProvider } from '@t3-react/components';
import { MainLayout } from '@t3-react/layout';
import { useAuthStore } from '@t3-react/store';

// Lazy load pages
const HomePage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.HomePage }))
);
const InputsPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.InputsPage }))
);
const OutputsPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.OutputsPage }))
);
const VariablesPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.VariablesPage }))
);
const ProgramsPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.ProgramsPage }))
);
const ControllersPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.ControllersPage }))
);
const GraphicsPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.GraphicsPage }))
);
const SchedulesPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.SchedulesPage }))
);
const HolidaysPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.HolidaysPage }))
);
const TrendLogsPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.TrendLogsPage }))
);
const AlarmsPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.AlarmsPage }))
);
const NetworkPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.NetworkPage }))
);
const ArrayPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.ArrayPage }))
);
const SettingsPage = React.lazy(() =>
  import('@t3-react/pages').then((m) => ({ default: m.SettingsPage }))
);

/**
 * Protected Route Wrapper
 * Redirects to login if not authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state: any) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Main App Component
 */
export const App: React.FC = () => {
  const [theme] = React.useState<'light' | 'dark'>('light');

  return (
    <FluentProvider theme={theme === 'light' ? webLightTheme : webDarkTheme}>
      <ErrorBoundary>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Redirect root to T3000 home */}
              <Route path="/" element={<Navigate to="/t3000" replace />} />

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
                      <HomePage />
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
                  path="settings"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <SettingsPage />
                    </React.Suspense>
                  }
                />
              </Route>

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/t3000" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ErrorBoundary>
    </FluentProvider>
  );
};
