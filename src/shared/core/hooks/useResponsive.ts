/**
 * useResponsive — convenience wrapper around useDeviceType.
 * Provides boolean flags and current breakpoint name.
 *
 * Usage:
 *   const { isMobile, isTablet, isDesktop } = useResponsive();
 */

import { useDeviceType, type DeviceType } from './useDeviceType';

export interface ResponsiveState {
  /** Width < 768px */
  isMobile: boolean;
  /** Width 768–1024px */
  isTablet: boolean;
  /** Width > 1024px */
  isDesktop: boolean;
  /** Raw breakpoint name */
  breakpoint: DeviceType;
}

export const useResponsive = (): ResponsiveState => {
  const breakpoint = useDeviceType();
  return {
    isMobile:  breakpoint === 'mobile',
    isTablet:  breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    breakpoint,
  };
};
