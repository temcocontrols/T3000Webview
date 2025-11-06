/**
 * Auth Store - Manages authentication state
 *
 * Responsibilities:
 * - User authentication
 * - Session management
 * - User profile
 * - Permissions
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, LoginCredentials, UserRole, Permission } from '@common/types/auth';
import { authApi } from '@common/api/auth';

export interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Session
  sessionTimeout: number; // milliseconds
  lastActivity: number | null;

  // Auth actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  validateSession: () => Promise<boolean>;

  // User management
  updateProfile: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Permissions
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  canAccessWindow: (windowId: number) => boolean;

  // Session management
  updateActivity: () => void;
  checkSessionTimeout: () => boolean;
  setSessionTimeout: (timeout: number) => void;

  // Utilities
  reset: () => void;
}

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  lastActivity: null,
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Auth actions
        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.login(credentials);

            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false,
              lastActivity: Date.now(),
            });
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Login failed',
            });
            throw error;
          }
        },

        logout: async () => {
          try {
            await authApi.logout();
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              lastActivity: null,
              error: null,
            });
          }
        },

        refreshToken: async () => {
          try {
            const response = await authApi.refreshToken();

            set({
              token: response.data.token,
              lastActivity: Date.now(),
            });
          } catch (error) {
            // Token refresh failed - logout
            get().logout();
            throw error;
          }
        },

        validateSession: async () => {
          if (!get().isAuthenticated) {
            return false;
          }

          try {
            const response = await authApi.validateSession();

            if (response.data.valid) {
              set({ lastActivity: Date.now() });
              return true;
            } else {
              get().logout();
              return false;
            }
          } catch (error) {
            get().logout();
            return false;
          }
        },

        // User management
        updateProfile: async (updates: Partial<User>) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authApi.updateProfile(updates);

            set({
              user: response.data,
              isLoading: false,
            });
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update profile',
            });
            throw error;
          }
        },

        changePassword: async (currentPassword: string, newPassword: string) => {
          set({ isLoading: true, error: null });
          try {
            await authApi.changePassword({ currentPassword, newPassword });

            set({ isLoading: false });
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to change password',
            });
            throw error;
          }
        },

        // Permissions
        hasPermission: (permission: Permission) => {
          const { user } = get();
          if (!user) return false;

          return user.permissions?.includes(permission) ?? false;
        },

        hasRole: (role: UserRole) => {
          const { user } = get();
          if (!user) return false;

          return user.role === role;
        },

        canAccessWindow: (windowId: number) => {
          const { user } = get();
          if (!user) return false;

          // Admin can access everything
          if (user.role === 'admin') return true;

          // Check window-specific permissions (if implemented)
          // For now, allow all authenticated users
          return true;
        },

        // Session management
        updateActivity: () => {
          set({ lastActivity: Date.now() });
        },

        checkSessionTimeout: () => {
          const { lastActivity, sessionTimeout, isAuthenticated } = get();

          if (!isAuthenticated || !lastActivity) {
            return false;
          }

          const elapsed = Date.now() - lastActivity;

          if (elapsed > sessionTimeout) {
            get().logout();
            return true; // Session timed out
          }

          return false; // Session still valid
        },

        setSessionTimeout: (timeout: number) => {
          set({ sessionTimeout: timeout });
        },

        // Utilities
        reset: () => {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            lastActivity: null,
            error: null,
          });
        },
      }),
      {
        name: 't3000-auth-store',
        partialize: (state: AuthState) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
          sessionTimeout: state.sessionTimeout,
        }),
      }
    ),
    {
      name: 'AuthStore',
    }
  )
);

// Selectors
export const authSelectors = {
  user: (state: AuthState) => state.user,
  isAuthenticated: (state: AuthState) => state.isAuthenticated,
  isLoading: (state: AuthState) => state.isLoading,
  error: (state: AuthState) => state.error,
  userRole: (state: AuthState) => state.user?.role,
  userName: (state: AuthState) => state.user?.username,
};
