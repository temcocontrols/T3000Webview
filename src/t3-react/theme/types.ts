/**
 * Theme Type Definitions
 *
 * Defines the structure for application themes
 * to enable consistent theming across all components
 */

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryActive: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  // Surface colors (cards, panels)
  surface: string;
  surfaceHover: string;
  surfaceSelected: string;

  // Sidebar colors
  sidebarBackground: string;
  sidebarText: string;
  sidebarHover: string;
  sidebarSelected: string;
  sidebarBorder: string;

  // Header colors
  headerBackground: string;
  headerText: string;
  headerBorder: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Border colors
  border: string;
  borderLight: string;
  borderDark: string;

  // Message/Alert colors
  info: string;
  infoBackground: string;
  infoText: string;

  warning: string;
  warningBackground: string;
  warningText: string;

  error: string;
  errorBackground: string;
  errorText: string;

  success: string;
  successBackground: string;
  successText: string;
}

export interface ThemeTypography {
  fontFamily: string;

  // Font sizes
  fontSizeH1: string;
  fontSizeH2: string;
  fontSizeH3: string;
  fontSizeBody: string;
  fontSizeSmall: string;
  fontSizeTiny: string;

  // Font weights
  fontWeightRegular: number;
  fontWeightMedium: number;
  fontWeightSemibold: number;
  fontWeightBold: number;

  // Line heights
  lineHeightH1: string;
  lineHeightH2: string;
  lineHeightH3: string;
  lineHeightBody: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeShadows {
  card: string;
  cardHover: string;
  dropdown: string;
  modal: string;
}

export interface ThemeLayout {
  headerHeight: string;
  sidebarWidth: string;
  sidebarCollapsedWidth: string;
  borderRadius: string;
  borderWidth: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  shadows: ThemeShadows;
  layout: ThemeLayout;
}

export type ThemeName = 'azure' | 'dark' | 'light';
