/**
 * Authentication API
 * Handles user login, logout, and permission management
 */

import { api, auth as authToken } from './client';
import type { ApiResponse } from '../types';

export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export interface UserPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManageDevices: boolean;
  canManageUsers: boolean;
  canViewSettings: boolean;
  canEditSettings: boolean;
}

/**
 * Login user
 */
export async function login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  const response = await api.post<LoginResponse>('/auth/login', credentials);

  if (response.success && response.data) {
    authToken.setToken(response.data.token, credentials.remember || false);
  }

  return response;
}

/**
 * Logout user
 */
export async function logout(): Promise<ApiResponse<void>> {
  const response = await api.post<void>('/auth/logout');
  authToken.removeToken();
  return response;
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<ApiResponse<LoginResponse['user']>> {
  return api.get<LoginResponse['user']>('/auth/me');
}

/**
 * Get user permissions
 */
export async function getUserPermissions(): Promise<ApiResponse<UserPermissions>> {
  return api.get<UserPermissions>('/auth/permissions');
}

/**
 * Refresh authentication token
 */
export async function refreshToken(): Promise<ApiResponse<{ token: string }>> {
  const response = await api.post<{ token: string }>('/auth/refresh');

  if (response.success && response.data) {
    authToken.setToken(response.data.token, true);
  }

  return response;
}

/**
 * Change password
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<ApiResponse<void>> {
  return api.post<void>('/auth/change-password', { oldPassword, newPassword });
}
