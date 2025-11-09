/**
 * Theme Index
 * 
 * Central export for all theme files
 */

export * from './types';
export { azureTheme } from './azureTheme';
export { darkTheme } from './darkTheme';
export { lightTheme } from './lightTheme';

import { azureTheme } from './azureTheme';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';
import type { Theme, ThemeName } from './types';

// Theme registry
export const themes: Record<ThemeName, Theme> = {
  azure: azureTheme,
  dark: darkTheme,
  light: lightTheme,
};

// Get theme by name
export function getTheme(name: ThemeName): Theme {
  return themes[name] || azureTheme;
}

// Default theme
export const defaultTheme = azureTheme;
