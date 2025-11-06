/**
 * UI Store - Manages UI state
 *
 * Responsibilities:
 * - Active window tracking
 * - Panel visibility (left tree, right properties)
 * - Dialog/modal state
 * - Layout preferences
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { WINDOW_IDS } from '@t3-react/config/constants';

interface DialogState {
  id: string;
  props?: Record<string, any>;
}

export interface UiState {
  // Window state
  activeWindow: number;
  windowHistory: number[];

  // Panel visibility
  isLeftPanelVisible: boolean;
  isRightPanelVisible: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;

  // Dialog/Modal state
  activeDialog: DialogState | null;
  dialogStack: DialogState[];

  // Layout
  isFullscreen: boolean;
  theme: 'light' | 'dark';

  // Window management
  setActiveWindow: (windowId: number) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  // Panel management
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelVisible: (visible: boolean) => void;
  setRightPanelVisible: (visible: boolean) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  // Dialog management
  openDialog: (id: string, props?: Record<string, any>) => void;
  closeDialog: () => void;
  closeAllDialogs: () => void;

  // Layout
  toggleFullscreen: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Utilities
  isWindowActive: (windowId: number) => boolean;
  hasActiveDialog: () => boolean;
  reset: () => void;
}

const initialState: Omit<UiState, keyof {
  setActiveWindow: any;
  goBack: any;
  goForward: any;
  canGoBack: any;
  canGoForward: any;
  toggleLeftPanel: any;
  toggleRightPanel: any;
  setLeftPanelVisible: any;
  setRightPanelVisible: any;
  setLeftPanelWidth: any;
  setRightPanelWidth: any;
  openDialog: any;
  closeDialog: any;
  closeAllDialogs: any;
  toggleFullscreen: any;
  setTheme: any;
  isWindowActive: any;
  hasActiveDialog: any;
  reset: any;
}> = {
  activeWindow: WINDOW_IDS.HOME,
  windowHistory: [WINDOW_IDS.HOME],
  isLeftPanelVisible: true,
  isRightPanelVisible: false,
  leftPanelWidth: 250,
  rightPanelWidth: 300,
  activeDialog: null,
  dialogStack: [],
  isFullscreen: false,
  theme: 'light',
};

export const useUIStore = create<UiState>()(
  devtools(
    persist(
      (set: any, get: any) => ({
        ...initialState,

        // Window management
        setActiveWindow: (windowId: number) => {
          set((state: UiState) => {
            // Don't add duplicate if it's already the active window
            if (state.activeWindow === windowId) {
              return state;
            }

            // Add to history
            const windowHistory = [...state.windowHistory, windowId];

            // Keep history to max 50 items
            if (windowHistory.length > 50) {
              windowHistory.shift();
            }

            return {
              activeWindow: windowId,
              windowHistory,
            };
          });
        },

        goBack: () => {
          set((state: UiState) => {
            if (state.windowHistory.length <= 1) return state;

            const newHistory = [...state.windowHistory];
            newHistory.pop(); // Remove current
            const previousWindow = newHistory[newHistory.length - 1];

            return {
              activeWindow: previousWindow,
              windowHistory: newHistory,
            };
          });
        },

        goForward: () => {
          // Not implemented - would need separate forward stack
        },

        canGoBack: () => {
          return get().windowHistory.length > 1;
        },

        canGoForward: (): boolean => {
          return false; // Not implemented
        },

        // Panel management
        toggleLeftPanel: () => {
          set((state: UiState) => ({
            isLeftPanelVisible: !state.isLeftPanelVisible,
          }));
        },

        toggleRightPanel: () => {
          set((state: UiState) => ({
            isRightPanelVisible: !state.isRightPanelVisible,
          }));
        },

        setLeftPanelVisible: (visible: boolean) => {
          set({ isLeftPanelVisible: visible });
        },

        setRightPanelVisible: (visible: boolean) => {
          set({ isRightPanelVisible: visible });
        },

        setLeftPanelWidth: (width: number) => {
          set({ leftPanelWidth: Math.max(200, Math.min(width, 500)) });
        },

        setRightPanelWidth: (width: number) => {
          set({ rightPanelWidth: Math.max(250, Math.min(width, 600)) });
        },

        // Dialog management
        openDialog: (id: string, props?: any) => {
          set((state: UiState) => {
            const dialog: DialogState = { id, props };
            return {
              activeDialog: dialog,
              dialogStack: [...state.dialogStack, dialog],
            };
          });
        },

        closeDialog: () => {
          set((state: UiState) => {
            const newStack = [...state.dialogStack];
            newStack.pop();
            const activeDialog = newStack[newStack.length - 1] || null;

            return {
              activeDialog,
              dialogStack: newStack,
            };
          });
        },

        closeAllDialogs: () => {
          set({
            activeDialog: null,
            dialogStack: [],
          });
        },

        // Layout
        toggleFullscreen: () => {
          set((state: UiState) => ({
            isFullscreen: !state.isFullscreen,
          }));
        },

        setTheme: (theme: 'light' | 'dark') => {
          set({ theme });
        },

        // Utilities
        isWindowActive: (windowId: number) => {
          return get().activeWindow === windowId;
        },

        hasActiveDialog: () => {
          return get().activeDialog !== null;
        },

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 't3000-ui-store',
        partialize: (state: UiState) => ({
          isLeftPanelVisible: state.isLeftPanelVisible,
          isRightPanelVisible: state.isRightPanelVisible,
          leftPanelWidth: state.leftPanelWidth,
          rightPanelWidth: state.rightPanelWidth,
          theme: state.theme,
        }),
      }
    ),
    {
      name: 'UiStore',
    }
  )
);

// Selectors
export const uiSelectors = {
  activeWindow: (state: UiState) => state.activeWindow,
  isLeftPanelVisible: (state: UiState) => state.isLeftPanelVisible,
  isRightPanelVisible: (state: UiState) => state.isRightPanelVisible,
  activeDialog: (state: UiState) => state.activeDialog,
  hasActiveDialog: (state: UiState) => state.activeDialog !== null,
  theme: (state: UiState) => state.theme,
};
