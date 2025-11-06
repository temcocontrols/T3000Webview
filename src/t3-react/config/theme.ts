/**
 * Fluent UI Theme Configuration
 * T3000 desktop color scheme
 */

import {
  createLightTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';

/**
 * T3000 Brand Colors
 * Based on desktop application color scheme
 */
const t3000BrandColors: BrandVariants = {
  10: '#F5F5F5', // Very light gray - background
  20: '#FAFAFA', // Off-white - secondary background
  30: '#EEEEEE', // Light gray - borders
  40: '#E0E0E0', // Medium light gray
  50: '#BDBDBD', // Medium gray
  60: '#9E9E9E', // Gray
  70: '#757575', // Dark gray
  80: '#616161', // Darker gray
  90: '#424242', // Very dark gray
  100: '#212121', // Almost black
  110: '#333333', // Dark gray - text
  120: '#0078D4', // Blue - primary action
  130: '#107C10', // Green - success
  140: '#FF8C00', // Orange - warning
  150: '#D13438', // Red - error/danger
  160: '#FFFFFF', // White - content background
};

/**
 * Create T3000 Light Theme
 */
export const t3000Theme: Theme = createLightTheme(t3000BrandColors);

/**
 * Custom T3000 color tokens
 * Extended colors beyond the Fluent UI theme
 */
export const t3000Colors = {
  // Backgrounds
  backgroundPrimary: '#FFFFFF',
  backgroundSecondary: '#FAFAFA',
  backgroundTertiary: '#F5F5F5',
  
  // Borders
  borderDefault: '#E0E0E0',
  borderHover: '#BDBDBD',
  borderActive: '#0078D4',
  
  // Text
  textPrimary: '#333333',
  textSecondary: '#616161',
  textDisabled: '#9E9E9E',
  textOnPrimary: '#FFFFFF',
  
  // Status colors
  statusOnline: '#107C10',
  statusOffline: '#D13438',
  statusWarning: '#FF8C00',
  statusInfo: '#0078D4',
  
  // Component colors
  topMenuBackground: '#F5F5F5',
  toolbarBackground: '#FAFAFA',
  statusBarBackground: '#F5F5F5',
  treeBackground: '#FFFFFF',
  treeBorder: '#E0E0E0',
  treeHover: '#F0F0F0',
  treeSelected: '#E3F2FD',
  treeSelectedBorder: '#0078D4',
  
  // Data grid colors
  gridHeader: '#F5F5F5',
  gridRow: '#FFFFFF',
  gridRowAlt: '#FAFAFA',
  gridRowHover: '#F0F0F0',
  gridRowSelected: '#E3F2FD',
  gridBorder: '#E0E0E0',
  
  // Chart colors
  chartPrimary: '#0078D4',
  chartSecondary: '#107C10',
  chartTertiary: '#FF8C00',
  chartQuaternary: '#D13438',
  chartGrid: '#E0E0E0',
  chartText: '#333333',
  
  // Alarm priority colors
  alarmPriority1: '#D13438', // Critical - Red
  alarmPriority2: '#FF8C00', // High - Orange
  alarmPriority3: '#FFD700', // Medium - Yellow/Gold
  alarmPriority4: '#0078D4', // Low - Blue
  alarmPriority5: '#9E9E9E', // Info - Gray
} as const;

/**
 * Layout dimensions
 */
export const layoutDimensions = {
  topMenuHeight: 32,
  toolbarHeight: 60,
  statusBarHeight: 24,
  leftPanelMinWidth: 150,
  leftPanelDefaultWidth: 250,
  leftPanelMaxWidth: 400,
  breadcrumbHeight: 36,
  tabListHeight: 48,
} as const;

/**
 * Spacing tokens
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Typography tokens
 */
export const typography = {
  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", sans-serif',
  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/**
 * Border radius tokens
 */
export const borderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  full: 9999,
} as const;

/**
 * Shadow tokens
 */
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
} as const;

/**
 * Transition durations
 */
export const transitions = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
} as const;

/**
 * Z-index layers
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;
