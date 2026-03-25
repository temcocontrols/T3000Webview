/**
 * useResponsive — convenience wrapper around useDeviceType.
 * Provides boolean flags and current breakpoint name.
 *
 * Usage:
 *   const { isMobile, isDesktop } = useResponsive();
 */

import { useDeviceType, type DeviceType } from './useDeviceType';

export interface ResponsiveState {
  /** Phone (short side < 768px) — always mobile regardless of orientation */
  isMobile: boolean;
  /** Tablet or larger (short side ≥ 768px) */
  isDesktop: boolean;
  /** Raw device type */
  breakpoint: DeviceType;
}

export const useResponsive = (): ResponsiveState => {
  const breakpoint = useDeviceType();
  return {
    isMobile:  breakpoint === 'mobile',
    isDesktop: breakpoint === 'desktop',
    breakpoint,
  };
};
