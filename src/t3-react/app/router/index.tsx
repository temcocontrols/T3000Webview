/**
 * React Router Configuration
 * Main router setup for T3000 React application
 */

import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { t3000Routes } from './routes';
import { MainLayout } from '../../layout/MainLayout';
import { LoadingSpinner } from '../../components';

/**
 * App Router Component
 * Sets up all routes with MainLayout wrapper and lazy loading
 */
export default function AppRouter() {
  return (
    <Routes>
      {/* Main layout wrapper for all routes */}
      <Route element={<MainLayout />}>
        {/* Map all routes */}
        {t3000Routes.map((route) => {
          const Component = route.element;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Component />
                </Suspense>
              }
            />
          );
        })}

        {/* Redirect root to /t3000 */}
        <Route path="/" element={<Navigate to="/t3000" replace />} />

        {/* 404 - redirect to home */}
        <Route path="*" element={<Navigate to="/t3000" replace />} />
      </Route>
    </Routes>
  );
}

/**
 * Export route utilities
 */
export {
  getRouteByPath,
  getRouteByWindowId,
  getRouteByShortcut,
  getDeviceRequiredRoutes,
  isDeviceRequired,
} from './routes';

export type { T3000Route } from './routes';
