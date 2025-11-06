/**
 * NotificationCenter Component
 * 
 * Toast notifications for user feedback
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Toast,
  ToastTitle,
  ToastBody,
  Toaster,
  useToastController,
  useId,
} from '@fluentui/react-components';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string) => {
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {message && <ToastBody>{message}</ToastBody>}
        </Toast>,
        { intent: type }
      );
    },
    [dispatchToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      showNotification('success', title, message);
    },
    [showNotification]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      showNotification('error', title, message);
    },
    [showNotification]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      showNotification('warning', title, message);
    },
    [showNotification]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      showNotification('info', title, message);
    },
    [showNotification]
  );

  const value: NotificationContextType = {
    showNotification,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationContext.Provider value={value}>
      <Toaster toasterId={toasterId} position="top-end" />
      {children}
    </NotificationContext.Provider>
  );
};
