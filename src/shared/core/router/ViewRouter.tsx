/**
 * View Router Component
 * Routes between desktop and mobile views based on viewport size
 */

import React from 'react';
import { useDeviceType } from '../hooks/useDeviceType';

export interface ViewRouterProps {
  desktopComponent: React.ComponentType;
  mobileComponent: React.ComponentType;
  tabletComponent?: React.ComponentType;
}

/**
 * Routes to appropriate view based on device type
 * - Mobile (< 768px): Shows mobile component
 * - Tablet (768px - 1024px): Shows tablet component (or desktop if not provided)
 * - Desktop (> 1024px): Shows desktop component
 */
export const ViewRouter: React.FC<ViewRouterProps> = ({
  desktopComponent: DesktopComponent,
  mobileComponent: MobileComponent,
  tabletComponent: TabletComponent,
}) => {
  const deviceType = useDeviceType();

  if (deviceType === 'mobile') {
    return <MobileComponent />;
  }

  if (deviceType === 'tablet' && TabletComponent) {
    return <TabletComponent />;
  }

  return <DesktopComponent />;
};

/**
 * HOC to create a route that switches between desktop and mobile views
 */
export const createResponsiveRoute = (
  desktopComponent: React.ComponentType,
  mobileComponent: React.ComponentType,
  tabletComponent?: React.ComponentType
) => {
  return () => (
    <ViewRouter
      desktopComponent={desktopComponent}
      mobileComponent={mobileComponent}
      tabletComponent={tabletComponent}
    />
  );
};
