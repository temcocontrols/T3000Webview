/**
 * Keyboard & Button Navigation Hook for Tstat10 Simulator
 * Maps arrow keys and hardware button presses to menu navigation.
 */

import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  onNavigate: (direction: 'left' | 'right' | 'up' | 'down') => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({ onNavigate, enabled = true }: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          onNavigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          onNavigate('down');
          break;
      }
    },
    [onNavigate, enabled],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /** Handler for physical button clicks */
  const handleButtonPress = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      if (!enabled) return;
      onNavigate(direction);
    },
    [onNavigate, enabled],
  );

  return { handleButtonPress };
}
