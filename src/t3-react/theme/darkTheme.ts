/**
 * Dark Theme
 *
 * Dark mode variant with high contrast
 * for low-light environments
 */

import { Theme } from './types';

export const darkTheme: Theme = {
  name: 'dark',

  colors: {
    // Primary colors - Azure Blue (consistent)
    primary: '#0078d4',
    primaryHover: '#1a86d9',
    primaryActive: '#0066b8',

    // Background colors - Dark
    background: '#1e1e1e',
    backgroundSecondary: '#252525',
    backgroundTertiary: '#2d2d2d',

    // Surface colors
    surface: '#2d2d2d',
    surfaceHover: '#3d3d3d',
    surfaceSelected: '#4d4d4d',

    // Sidebar colors - Darker
    sidebarBackground: '#141414',
    sidebarText: '#e1e1e1',
    sidebarHover: 'rgba(255, 255, 255, 0.08)',
    sidebarSelected: '#0078d4',
    sidebarBorder: '#333333',

    // Header colors - Dark with Azure accent
    headerBackground: '#252525',
    headerText: '#ffffff',
    headerBorder: '#333333',

    // Text colors - Light on dark
    text: '#e1e1e1',
    textSecondary: '#b3b3b3',
    textTertiary: '#8a8a8a',
    textInverse: '#1e1e1e',

    // Border colors
    border: '#3d3d3d',
    borderLight: '#333333',
    borderDark: '#4d4d4d',

    // Message/Alert colors - Adapted for dark mode
    info: '#4ba3f3',
    infoBackground: '#1a3a52',
    infoText: '#b3d7f7',

    warning: '#ffb900',
    warningBackground: '#4d3800',
    warningText: '#ffe58f',

    error: '#f85149',
    errorBackground: '#4d1f1c',
    errorText: '#ffc1bd',

    success: '#3fb950',
    successBackground: '#1c4d25',
    successText: '#b3e6bf',
  },

  typography: {
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', sans-serif",

    // Font sizes - Azure Portal standard (same across all themes)
    fontSizeH1: '24px',     // Blade titles (weight: 600)
    fontSizeH2: '18px',     // Section headers/greeting (weight: 600)
    fontSizeH3: '14px',     // Small headers/labels (weight: 600)
    fontSizeBody: '13px',   // Body text (Azure's standard size)
    fontSizeSmall: '12px',  // Notes, descriptions
    fontSizeTiny: '10px',   // Small labels, meta info

    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,

    // Line heights - Azure Portal patterns
    lineHeightH1: '28px',   // 24px font → 28px line height
    lineHeightH2: '24px',   // 18px font → 24px line height
    lineHeightH3: '18px',   // 14px font → 18px line height
    lineHeightBody: '18px', // 13px font → 18px line height
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  shadows: {
    card: '0 1px 2px rgba(0, 0, 0, 0.4)',
    cardHover: '0 4px 8px rgba(0, 0, 0, 0.5)',
    dropdown: '0 6px 12px rgba(0, 0, 0, 0.6)',
    modal: '0 8px 16px rgba(0, 0, 0, 0.7)',
  },

  layout: {
    headerHeight: '48px',
    sidebarWidth: '220px',
    sidebarCollapsedWidth: '48px',
    borderRadius: '4px',
    borderWidth: '1px',
  },
};
