/**
 * Device Type Detection Hook
 *
 * Two-layout model — phones and tablets → mobile, laptops/desktops → desktop.
 *
 * Uses window.innerWidth (same as CSS media queries), so it responds to:
 *   - Browser window resize on desktop
 *   - Device rotation on phones/tablets
 *
 * Breakpoint: 1200px (Bootstrap xl / Tailwind xl)
 *   < 1200px  → MobileShell  (all phones, tablets up to ~iPad Pro 11" landscape)
 *   ≥ 1200px  → DesktopLayout (large tablets 12.9"+ landscape, all laptops/desktops)
 *
 * To move the split globally, change MOBILE_BREAKPOINT only.
 */

import { useState, useEffect } from 'react';

/** Simple two-state device type */
export type DeviceType = 'mobile' | 'desktop';

/** Orientation descriptor for layout components that need it */
export type LayoutMode = 'mobile-portrait' | 'mobile-landscape' | 'desktop';

// ─── breakpoint ──────────────────────────────────────────────────────────────

/**
 * Single breakpoint separating mobile/tablet from desktop.
 * Change this one constant to adjust the split globally.
 */
export const MOBILE_BREAKPOINT = 1200;

// ─── internal helpers ─────────────────────────────────────────────────────────

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function isLandscapeNow(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('landscape');
  }
  return window.innerWidth > window.innerHeight;
}

function getLayoutMode(): LayoutMode {
  if (!isMobileDevice()) return 'desktop';
  return isLandscapeNow() ? 'mobile-landscape' : 'mobile-portrait';
}

function getDeviceType(): DeviceType {
  return isMobileDevice() ? 'mobile' : 'desktop';
}

// ─── hooks ───────────────────────────────────────────────────────────────────

/** Layout mode — use when orientation matters (e.g. landscape column expansion) */
export const useLayoutMode = (): LayoutMode => {
  const [mode, setMode] = useState<LayoutMode>(getLayoutMode);

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(tid);
      tid = setTimeout(() => setMode(getLayoutMode()), 50);
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.screen?.orientation?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.screen?.orientation?.removeEventListener?.('change', update);
      clearTimeout(tid);
    };
  }, []);

  return mode;
};

/** Primary hook — returns 'mobile' or 'desktop' */
export const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType);

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(tid);
      tid = setTimeout(() => setDeviceType(getDeviceType()), 150);
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      clearTimeout(tid);
    };
  }, []);

  return deviceType;
};

export const useIsMobile  = (): boolean => useDeviceType() === 'mobile';
export const useIsDesktop = (): boolean => useDeviceType() === 'desktop';

