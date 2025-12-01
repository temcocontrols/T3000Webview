/**
 * ThemeProvider Component
 *
 * Provides theme context to all child components
 * Handles theme switching and persistence
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeName, themes, defaultTheme } from './index';

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 't3000-theme';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Load theme from localStorage or use default
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as ThemeName) || 'azure';
  });

  const [theme, setThemeState] = useState<Theme>(themes[themeName] || defaultTheme);

  // Update theme when themeName changes
  useEffect(() => {
    const newTheme = themes[themeName] || defaultTheme;
    setThemeState(newTheme);

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, themeName);

    // Apply theme to document root for global CSS variables
    applyThemeToRoot(newTheme);
  }, [themeName]);

  const setTheme = (name: ThemeName) => {
    setThemeName(name);
  };

  const value: ThemeContextValue = {
    theme,
    themeName,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Apply theme variables to document root
function applyThemeToRoot(theme: Theme) {
  const root = document.documentElement;

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--t3-color-${camelToKebab(key)}`, value);
  });

  // Typography
  Object.entries(theme.typography).forEach(([key, value]) => {
    root.style.setProperty(`--t3-${camelToKebab(key)}`, String(value));
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--t3-spacing-${key}`, value);
  });

  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--t3-shadow-${camelToKebab(key)}`, value);
  });

  // Layout
  Object.entries(theme.layout).forEach(([key, value]) => {
    root.style.setProperty(`--t3-${camelToKebab(key)}`, value);
  });
}

// Helper to convert camelCase to kebab-case
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Hook to use theme context
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
