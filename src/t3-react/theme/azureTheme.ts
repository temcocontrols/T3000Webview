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

    // Background colors - From actual Azure Portal
    background: '#faf9f8',          // Main content area
    backgroundSecondary: '#f3f2f1', // Secondary background (Azure uses #f3f2f1)
    backgroundTertiary: '#ffffff',  // Pure white

    // Surface colors (cards, panels) - Azure Portal uses white
    surface: '#ffffff',
    surfaceHover: '#f8f8f8',
    surfaceSelected: 'rgba(85, 179, 255, 0.2)',  // Light blue (from Azure)

    // Sidebar colors - White sidebar (from actual Azure Portal)
    sidebarBackground: '#ffffff',   // White sidebar
    sidebarText: '#323130',         // Dark text (Azure Portal uses #000 or #323130)
    sidebarHover: '#f3f2f1',        // Very subtle gray hover
    sidebarSelected: 'rgba(85, 179, 255, 0.2)',  // Light blue selected (from Azure Portal)
    sidebarBorder: '#edebe9',       // Soft border

    // Header/Topbar colors - AZURE BLUE (from actual Azure Portal)
    headerBackground: '#0078d4',    // Azure blue topbar (NOT light gray!)
    headerText: '#ffffff',          // White text on blue
    headerBorder: '#005a9e',        // Darker blue border

    // Text colors (from Azure Portal)
    text: '#323130',           // Primary text (Azure Portal uses #323130 or #201f1e)
    textSecondary: '#605e5c',  // Medium gray
    textTertiary: '#8a8886',   // Light gray
    textInverse: '#ffffff',    // White text

    // Border colors - From Azure Portal
    border: '#e1dfdd',        // Azure Portal primary border (--colorContainerBorderPrimary)
    borderLight: '#f3f2f1',   // Azure Portal secondary border
    borderDark: '#d2d0ce',

    // Message/Alert colors - From actual Azure Portal CSS variables
    info: '#015cda',              // Azure Portal info icon color
    infoBackground: '#dae4ff',    // Azure Portal info background
    infoText: '#004578',

    warning: '#ffb900',           // Azure Portal warning (unchanged)
    warningBackground: '#ffdfb8', // Azure Portal warning background
    warningText: '#8a5100',

    error: '#a4262c',             // Azure Portal error color
    errorBackground: '#fdd8db',   // Azure Portal error background
    errorText: '#a80000',

    success: '#57a300',           // Azure Portal success color
    successBackground: '#e6ffcc', // Azure Portal success background
    successText: '#094509',
  },

  typography: {
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', sans-serif",

    // Font sizes - From actual Azure Portal (13px is the standard body size!)
    fontSizeH1: '24px',     // Blade titles (weight: 600)
    fontSizeH2: '18px',     // Section headers/greeting (weight: 600)
    fontSizeH3: '14px',     // Small headers/labels (weight: 600)
    fontSizeBody: '13px',   // Body text (Azure's standard size, NOT 14px!)
    fontSizeSmall: '12px',  // Notes, descriptions
    fontSizeTiny: '10px',   // Small labels, meta info

    // Font weights
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,

    // Line heights - Based on Azure Portal patterns
    lineHeightH1: '28px',   // 24px font → 28px line height
    lineHeightH2: '24px',   // 18px font → 24px line height
    lineHeightH3: '18px',   // 14px font → 18px line height
    lineHeightBody: '18px', // 13px font → 18px line height (Azure uses line-height: normal which is ~1.38)
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
    card: '0 0.3px 0.9px rgba(0, 0, 0, 0.108), 0 1.6px 3.6px rgba(0, 0, 0, 0.132)',
    cardHover: '0 3.2px 7.2px rgba(0, 0, 0, 0.132), 0 12.8px 28.8px rgba(0, 0, 0, 0.108)',
    dropdown: '0 6.4px 14.4px rgba(0, 0, 0, 0.132), 0 25.6px 57.6px rgba(0, 0, 0, 0.108)',
    modal: '0 25.6px 57.6px rgba(0, 0, 0, 0.22), 0 4.8px 14.4px rgba(0, 0, 0, 0.18)',
  },

  layout: {
    headerHeight: '50px',
    sidebarWidth: '220px',
    sidebarCollapsedWidth: '48px',
    borderRadius: '2px',
    borderWidth: '1px',
  },
};
