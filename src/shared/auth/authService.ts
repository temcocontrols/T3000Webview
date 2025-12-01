/**
 * Shared authentication service
 * Used by both Vue and React applications
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  name?: string;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'current_user';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  /**
   * Get authentication token
   */
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Set authentication token
   */
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Remove authentication token
   */
  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Set refresh token
   */
  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  /**
   * Remove refresh token
   */
  static removeRefreshToken(): void {
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get current user
   */
  static getUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }

  /**
   * Set current user
   */
  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Remove current user
   */
  static removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Log in user
   */
  static login(token: string, refreshToken: string, user: User): void {
    this.setToken(token);
    this.setRefreshToken(refreshToken);
    this.setUser(user);
  }

  /**
   * Log out user and redirect to login page
   */
  static logout(): void {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUser();

    // Redirect to Vue login page
    window.location.href = '/v2/login';
  }

  /**
   * Get authorization header value
   */
  static getAuthHeader(): string | null {
    const token = this.getToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(roles: string[]): boolean {
    const user = this.getUser();
    return user ? roles.includes(user.role) : false;
  }
}
