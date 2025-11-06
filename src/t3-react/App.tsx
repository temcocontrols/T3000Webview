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
import { t3000Routes } from '@t3-react/router';
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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

              {/* T3000 Routes - All protected */}
              <Route
                path="/t3000"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <HomePage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/inputs"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <InputsPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/outputs"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <OutputsPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/variables"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <VariablesPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/programs"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <ProgramsPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/controllers"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <ControllersPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/graphics"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <GraphicsPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/schedules"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <SchedulesPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/holidays"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <HolidaysPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/trendlogs"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <TrendLogsPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/alarms"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <AlarmsPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/network"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <NetworkPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/array"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <ArrayPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/t3000/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <React.Suspense fallback={<div>Loading...</div>}>
                        <SettingsPage />
                      </React.Suspense>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/t3000" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ErrorBoundary>
    </FluentProvider>
  );
};
