/**
 * Azure Portal Theme
 * 
 * Theme configuration matching Azure Portal design system
 * with Azure blue primary color and professional styling
 */

import { Theme } from './types';

export const azureTheme: Theme = {
  name: 'azure',
  
  colors: {
    // Primary colors - Azure Blue
    primary: '#0078d4',
    primaryHover: '#106ebe',
    primaryActive: '#005a9e',
    
    // Background colors
    background: '#f3f2f1',          // Light gray page background
    backgroundSecondary: '#faf9f8', // Slightly lighter
    backgroundTertiary: '#edebe9',  // Slightly darker
    
    // Surface colors (cards, panels)
    surface: '#ffffff',
    surfaceHover: '#f3f2f1',
    surfaceSelected: '#e1dfdd',
    
    // Sidebar colors - Dark charcoal
    sidebarBackground: '#1e1e1e',
    sidebarText: '#ffffff',
    sidebarHover: 'rgba(255, 255, 255, 0.1)',
    sidebarSelected: '#0078d4',
    sidebarBorder: '#323130',
    
    // Header colors - Azure Blue
    headerBackground: '#0078d4',
    headerText: '#ffffff',
    headerBorder: '#106ebe',
    
    // Text colors
    text: '#323130',           // Primary text (dark gray)
    textSecondary: '#605e5c',  // Secondary text
    textTertiary: '#8a8886',   // Tertiary text (lighter)
    textInverse: '#ffffff',    // Text on dark backgrounds
    
    // Border colors
    border: '#e1dfdd',
    borderLight: '#edebe9',
    borderDark: '#d2d0ce',
    
    // Message/Alert colors - Azure Portal standard
    info: '#0078d4',
    infoBackground: '#cfe4fa',
    infoText: '#004578',
    
    warning: '#ffa500',
    warningBackground: '#fff4ce',
    warningText: '#333333',
    
    error: '#a80000',
    errorBackground: '#fde7e9',
    errorText: '#a80000',
    
    success: '#107c10',
    successBackground: '#dff6dd',
    successText: '#107c10',
  },
  
  typography: {
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', sans-serif",
    
    // Font sizes
    fontSizeH1: '28px',
    fontSizeH2: '20px',
    fontSizeH3: '16px',
    fontSizeBody: '14px',
    fontSizeSmall: '12px',
    fontSizeTiny: '10px',
    
    // Font weights
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,
    
    // Line heights
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
    card: '0 1px 2px rgba(0, 0, 0, 0.1)',
    cardHover: '0 4px 8px rgba(0, 0, 0, 0.15)',
    dropdown: '0 6px 12px rgba(0, 0, 0, 0.18)',
    modal: '0 8px 16px rgba(0, 0, 0, 0.2)',
  },
  
  layout: {
    headerHeight: '48px',
    sidebarWidth: '220px',
    sidebarCollapsedWidth: '48px',
    borderRadius: '4px',
    borderWidth: '1px',
  },
};
