/**
 * Keyboard & Button Navigation Hook for Tstat10 Simulator
 * Maps arrow keys and hardware button presses to menu navigation.
 */

import { useEffect, useCallback, useRef } from 'react';

interface UseKeyboardNavigationOptions {
  onNavigate: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onEnterSetup?: () => void;
  onToggleDrift?: () => void;
  onMoveRedbox?: (direction: 'w' | 'a' | 's' | 'd') => void;
  enabled?: boolean;
}

const LONG_PRESS_MS = 1500;

export function useKeyboardNavigation({ onNavigate, onEnterSetup, onToggleDrift, onMoveRedbox, enabled = true }: UseKeyboardNavigationOptions) {
  const leftDown = useRef(false);
  const rightDown = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const checkLongPress = useCallback(() => {
    clearLongPress();
    if (leftDown.current && rightDown.current && onEnterSetup) {
      longPressTimer.current = setTimeout(() => {
        if (leftDown.current && rightDown.current) {
          onEnterSetup();
        }
      }, LONG_PRESS_MS);
    }
  }, [onEnterSetup, clearLongPress]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (!leftDown.current) { leftDown.current = true; checkLongPress(); }
          onNavigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!rightDown.current) { rightDown.current = true; checkLongPress(); }
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
        case 'w':
        case 'W':
          onMoveRedbox?.('w');
          break;
        case 'a':
        case 'A':
          onMoveRedbox?.('a');
          break;
        case 's':
        case 'S':
          onMoveRedbox?.('s');
          break;
        case 'd':
        case 'D':
          // D moves redbox right when redbox handler exists, otherwise toggles drift
          if (onMoveRedbox) {
            onMoveRedbox('d');
          } else {
            onToggleDrift?.();
          }
          break;
      }
    },
    [onNavigate, onToggleDrift, onMoveRedbox, enabled, checkLongPress],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { leftDown.current = false; clearLongPress(); }
      if (e.key === 'ArrowRight') { rightDown.current = false; clearLongPress(); }
    },
    [clearLongPress],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Cleanup timer on unmount
  useEffect(() => () => clearLongPress(), [clearLongPress]);

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
