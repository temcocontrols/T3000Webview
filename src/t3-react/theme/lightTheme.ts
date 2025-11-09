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
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', sans-serif",
    
    fontSizeH1: '28px',
    fontSizeH2: '20px',
    fontSizeH3: '16px',
    fontSizeBody: '14px',
    fontSizeSmall: '12px',
    fontSizeTiny: '10px',
    
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,
    
    lineHeightH1: '36px',
    lineHeightH2: '28px',
    lineHeightH3: '22px',
    lineHeightBody: '20px',
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
