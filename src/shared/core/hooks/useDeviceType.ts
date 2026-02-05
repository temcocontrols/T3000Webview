/**
 * Device Type Detection Hook
 * Detects device type based on viewport width
 */

import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

/**
 * Detect device type based on viewport width
 * - Mobile: < 768px
 * - Tablet: 768px - 1024px
 * - Desktop: > 1024px
 */
export const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    // Initialize with current width
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;

      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    // Detect on resize with debounce
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(detectDevice, 150);
    };

    window.addEventListener('resize', handleResize);

    // Initial detection
    detectDevice();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return deviceType;
};

/**
 * Hook to check if current viewport is mobile
 */
export const useIsMobile = (): boolean => {
  const deviceType = useDeviceType();
  return deviceType === 'mobile';
};

/**
 * Hook to check if current viewport is tablet
 */
export const useIsTablet = (): boolean => {
  const deviceType = useDeviceType();
  return deviceType === 'tablet';
};

/**
 * Hook to check if current viewport is desktop
 */
export const useIsDesktop = (): boolean => {
  const deviceType = useDeviceType();
  return deviceType === 'desktop';
};
