/**
 * useGlobalMessage Hook
 *
 * Convenience hook for displaying global messages
 */

import { useCallback } from 'react';
import { useUIStore } from '@t3-react/store';
import type { GlobalMessage } from '@t3-react/components';

export const useGlobalMessage = () => {
  const setGlobalMessage = useUIStore((state) => state.setGlobalMessage);
  const dismissGlobalMessage = useUIStore((state) => state.dismissGlobalMessage);

  const showInfo = useCallback(
    (message: string, title?: string) => {
      const globalMessage: GlobalMessage = {
        id: `info-${Date.now()}`,
        type: 'info',
        title,
        message,
        dismissable: true,
      };
      setGlobalMessage(globalMessage);
    },
    [setGlobalMessage]
  );

  const showWarning = useCallback(
    (message: string, title?: string) => {
      const globalMessage: GlobalMessage = {
        id: `warning-${Date.now()}`,
        type: 'warning',
        title,
        message,
        dismissable: true,
      };
      setGlobalMessage(globalMessage);
    },
    [setGlobalMessage]
  );

  const showError = useCallback(
    (message: string, title?: string) => {
      const globalMessage: GlobalMessage = {
        id: `error-${Date.now()}`,
        type: 'error',
        title,
        message,
        dismissable: true,
      };
      setGlobalMessage(globalMessage);
    },
    [setGlobalMessage]
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      const globalMessage: GlobalMessage = {
        id: `success-${Date.now()}`,
        type: 'success',
        title,
        message,
        dismissable: true,
      };
      setGlobalMessage(globalMessage);
    },
    [setGlobalMessage]
  );

  const showMessage = useCallback(
    (message: GlobalMessage) => {
      setGlobalMessage(message);
    },
    [setGlobalMessage]
  );

  const dismiss = useCallback(() => {
    dismissGlobalMessage();
  }, [dismissGlobalMessage]);

  return {
    showInfo,
    showWarning,
    showError,
    showSuccess,
    showMessage,
    dismiss,
  };
};
