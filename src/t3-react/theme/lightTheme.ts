/**
 * Light Theme
 *
 * Clean light mode with soft colors
 * and high readability
 */

import { Theme } from './types';

export const lightTheme: Theme = {
  name: 'light',

  colors: {
    // Primary colors - Azure Blue
    primary: '#0078d4',
    primaryHover: '#106ebe',
    primaryActive: '#005a9e',

    // Background colors - Very light
    background: '#ffffff',
    backgroundSecondary: '#f9f9f9',
    backgroundTertiary: '#f3f3f3',

    // Surface colors
    surface: '#ffffff',
    surfaceHover: '#f9f9f9',
    surfaceSelected: '#e8e8e8',

    // Sidebar colors - Light gray
    sidebarBackground: '#f3f3f3',
    sidebarText: '#323130',
    sidebarHover: 'rgba(0, 0, 0, 0.05)',
    sidebarSelected: '#0078d4',
    sidebarBorder: '#e1e1e1',

    // Header colors - White with border
    headerBackground: '#ffffff',
    headerText: '#323130',
    headerBorder: '#e1e1e1',

    // Text colors
    text: '#323130',
    textSecondary: '#605e5c',
    textTertiary: '#8a8886',
    textInverse: '#ffffff',

    // Border colors
    border: '#e1e1e1',
    borderLight: '#f3f3f3',
    borderDark: '#d1d1d1',

    // Message/Alert colors - Light mode
    info: '#0078d4',
    infoBackground: '#e6f2fa',
    infoText: '#004578',

    warning: '#ff8c00',
    warningBackground: '#fff4ce',
    warningText: '#8a5100',

    error: '#d13438',
    errorBackground: '#fde7e9',
    errorText: '#a80000',

    success: '#107c10',
    successBackground: '#dff6dd',
    successText: '#0b5a08',
  },

  typography: {
    fontFamily: "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",

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
    card: '0 1px 2px rgba(0, 0, 0, 0.08)',
    cardHover: '0 4px 8px rgba(0, 0, 0, 0.12)',
    dropdown: '0 6px 12px rgba(0, 0, 0, 0.15)',
    modal: '0 8px 16px rgba(0, 0, 0, 0.18)',
  },

  layout: {
    headerHeight: '48px',
    sidebarWidth: '220px',
    sidebarCollapsedWidth: '48px',
    borderRadius: '4px',
    borderWidth: '1px',
  },
};
