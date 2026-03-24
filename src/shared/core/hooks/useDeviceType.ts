/**
 * Device Type Detection Hook
 *
 * Industry-standard approach (same as React Native, Ionic, Bootstrap):
 *   1. Physical device class  — Math.min(screen.width, screen.height)
 *      The shorter physical side never changes on rotate.
 *      Phone < 768px | Tablet 768–1023px | Desktop ≥ 1024px
 *   2. Orientation            — screen.orientation API (falls back to innerWidth > innerHeight)
 *      Changes on rotate, independent of device class.
 *
 * Combining both gives 5 reliable layout states:
 *   mobile-portrait | mobile-landscape | tablet-portrait | tablet-landscape | desktop
 */

import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

/** Physical device class — unaffected by rotation */
export type DeviceClass = 'phone' | 'tablet' | 'desktop';

/** Full 5-state layout descriptor */
export type LayoutMode =
  | 'mobile-portrait'
  | 'mobile-landscape'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'desktop';

// ─── internal helpers ────────────────────────────────────────────────────────

/** Physical class based on shortest screen dimension — rotation-stable */
function getPhysicalClass(): DeviceClass {
  if (typeof window === 'undefined') return 'desktop';
  const shortSide = Math.min(window.screen.width, window.screen.height);
  if (shortSide < 768) return 'phone';
  if (shortSide < 1024) return 'tablet';
  return 'desktop';
}

/** Orientation using screen.orientation API when available, fallback to aspect ratio */
function isLandscapeNow(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('landscape');
  }
  return window.innerWidth > window.innerHeight;
}

function getLayoutMode(): LayoutMode {
  const cls = getPhysicalClass();
  if (cls === 'desktop') return 'desktop';
  const landscape = isLandscapeNow();
  if (cls === 'phone') return landscape ? 'mobile-landscape' : 'mobile-portrait';
  return landscape ? 'tablet-landscape' : 'tablet-portrait';
}

function toDeviceType(cls: DeviceClass): DeviceType {
  if (cls === 'phone') return 'mobile';
  if (cls === 'tablet') return 'tablet';
  return 'desktop';
}

// ─── hooks ───────────────────────────────────────────────────────────────────

/** Full 5-state layout — use this for layout decisions that depend on orientation */
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

/** Legacy DeviceType — stable physical class, ignores orientation */
export const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>(() =>
    toDeviceType(getPhysicalClass())
  );

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(tid);
      tid = setTimeout(() => setDeviceType(toDeviceType(getPhysicalClass())), 150);
    };
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      clearTimeout(tid);
    };
  }, []);

  return deviceType;
};

export const useIsMobile  = (): boolean => useDeviceType() === 'mobile';
export const useIsTablet  = (): boolean => useDeviceType() === 'tablet';
export const useIsDesktop = (): boolean => useDeviceType() === 'desktop';

