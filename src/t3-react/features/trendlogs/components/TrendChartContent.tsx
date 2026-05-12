/**
 * Trend Chart Content
 *
 * Shared content component used by both:
 * - TrendChartPage (full page mode from C++)
 * - TrendChartDrawer (popup mode from React)
 *
 * Features:
 * - Real-time data updates (every 5 seconds)
 * - Historical data from database
 * - Multiple time ranges with proper divisions (4 or 6)
 * - Auto-scaling with 3x zoom for small variations
 * - 10 Y-axis tick marks for precise reading
 * - Automatic gap filling on page visibility change
 * - Color scheme with cyan at position 20
 * - Series visibility toggle
 * - Pan/zoom functionality
 * - Export to CSV
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Dropdown,
  Option,
  Switch,
  Text,
  Spinner,
  makeStyles,
  mergeClasses,
  tokens,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Button,
  Tooltip,
  Tag,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Checkbox,
  Input,
  OverlayDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  DrawerFooter,
  RadioGroup,
  Radio,
} from '@fluentui/react-components';
import {
  ArrowDownloadRegular,
  ArrowResetRegular,
  ChevronDownRegular,
  DatabaseRegular,
  ImageRegular,
  ArrowUpRegular,
  ArrowDownRegular,
  ArrowLeftRegular,
  ArrowRightRegular,
  SettingsRegular,
  ErrorCircleRegular,
  ChevronRightRegular,
  ChevronLeftRegular,
  ChevronDownFilled,
  ArrowClockwiseRegular,
  WarningRegular,
  CheckmarkRegular,
  DismissRegular,
  ClockRegular,
  DeleteRegular,
} from '@fluentui/react-icons';
import { TrendChart, TrendSeries } from './TrendChart.tsx';
import { TrendChartApiService, TrendDataRequest } from '../services/trendChartApi';
import { useDeviceTreeStore } from '../../devices/store/deviceTreeStore';
import { API_BASE_URL } from '../../../config/constants';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    gap: '0',
    overflow: 'hidden',
  },
  topControlsBar: {
    padding: '4px 8px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    flexShrink: 0,
  },
  controlsMainFlex: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  },
  // ANALOG AREA (Top Section)
  analogArea: {
    display: 'flex',
    flexDirection: 'row',
    // Dynamic height: 100% if no digital series, 60% if digital series exist
    flex: 2, // Top area takes 2 parts (67%)
    minHeight: '200px',
    gap: '6px',
    overflow: 'hidden',
    padding: '4px',
    backgroundColor: '#f5f5f5',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    position: 'relative',
  },
  leftPanel: {
    width: 'clamp(180px, 20vw, 280px)',
    backgroundColor: '#fafafa',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '0px',
    overflowY: 'auto',
    overflowX: 'hidden',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#fafafa',
    border: 'none',
    borderRadius: '0px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '200px',
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'thin',
    scrollbarColor: '#d0d0d0 transparent',
    '::-webkit-scrollbar': { width: '4px' },
    '::-webkit-scrollbar-track': { background: 'transparent' },
    '::-webkit-scrollbar-thumb': { background: '#d0d0d0', borderRadius: '2px' },
  },
  // RESIZABLE DIVIDER
  resizableDivider: {
    height: '3px',
    background: 'linear-gradient(to bottom, #e1e4e8 0%, #d1d5da 50%, #e1e4e8 100%)',
    cursor: 'row-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
    transition: 'background 0.2s ease',
    ':hover': {
      background: 'linear-gradient(to bottom, #c6cbd1 0%, #959da5 50%, #c6cbd1 100%)',
    },
  },
  dividerGrip: {
    width: '40px',
    height: '1.5px',
    background: '#959da5',
    borderRadius: '2px',
    boxShadow: '0 -1px 0 rgba(255, 255, 255, 0.5), 0 1px 0 rgba(255, 255, 255, 0.5)',
  },
  // DIGITAL AREA (Bottom Section)
  digitalArea: {
    flex: 1, // Bottom area takes 1 part (25%)
    minHeight: '150px',
    backgroundColor: '#f5f5f5',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '4px',
    display: 'flex',
    flexDirection: 'row',
    gap: '6px',
    overflow: 'hidden',
  },
  digitalLeftPanel: {
    width: 'clamp(180px, 20vw, 280px)',
    backgroundColor: '#fafafa',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '0px',
    overflowY: 'auto',
    overflowX: 'hidden',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  digitalRightPanel: {
    flex: 1,
    backgroundColor: '#fafafa',
    border: 'none',
    borderRadius: '0px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '200px',
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'thin',
    scrollbarColor: '#d0d0d0 transparent',
    '::-webkit-scrollbar': { width: '4px' },
    '::-webkit-scrollbar-track': { background: 'transparent' },
    '::-webkit-scrollbar-thumb': { background: '#d0d0d0', borderRadius: '2px' },
  },
  seriesPanelHeader: {
    padding: '6px 8px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e8e8e8',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
    marginBottom: '8px',
  },
  seriesPanelHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  collapseBtn: {
    minWidth: '20px',
    width: '20px',
    height: '20px',
    padding: '0',
    border: '1px solid #d9d9d9',
    borderRadius: '3px',
    backgroundColor: '#fff',
    color: '#595959',
    ':hover': {
      backgroundColor: '#e6e6e6',
      color: '#262626',
    },
  },
  leftPanelCollapsed: {
    width: '0 !important' as '0',
    minWidth: '0 !important' as '0',
    overflow: 'hidden',
    padding: '0',
    border: 'none',
  },
  expandTab: {
    position: 'absolute',
    left: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    width: '16px',
    height: '40px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #d9d9d9',
    borderLeft: 'none',
    borderRadius: '0 4px 4px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#595959',
    ':hover': {
      backgroundColor: '#e0e0e0',
      color: '#262626',
    },
  },
  filterBarBtn: {
    fontSize: '11px',
    paddingLeft: '6px',
    paddingRight: '6px',
    minHeight: '26px',
  },
  filterMenuItem: {
    fontSize: '11px',
    minHeight: '26px',
    paddingTop: '2px',
    paddingBottom: '2px',
  },
  seriesPanelToolbar: {
    padding: '4px',
    backgroundColor: '#ffffff',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
  headerLine: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    width: '100%',
  },
  leftControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingLeft: '2px',
  },
  autoScrollToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  seriesPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    padding: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderTop: 'none',
    scrollbarWidth: 'thin',
    scrollbarColor: '#d0d0d0 transparent',
    '::-webkit-scrollbar': {
      width: '4px',
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
      background: '#d0d0d0',
      borderRadius: '2px',
    },
  },
  seriesItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '6px 2px 6px 8px',
    backgroundColor: '#ffffff',
    border: '1px solid #e8e8e8',
    borderRadius: '4px',
    marginBottom: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    ':hover': {
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
  },
  digitalSectionDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    backgroundColor: '#f0f0f0',
    borderTop: '1px solid #d9d9d9',
    borderBottom: '1px solid #d9d9d9',
    fontSize: '10px',
    fontWeight: '600',
    color: '#595959',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '2px',
  },
  seriesItemExpanded: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
  deleteButton: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    minWidth: '24px',
    width: '24px',
    height: '24px',
    padding: '0',
    zIndex: 2,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusCircular,
    ':hover': {
      backgroundColor: tokens.colorPaletteRedBackground3,
      color: tokens.colorNeutralForegroundOnBrand,
    },
  },
  colorIndicator: {
    width: '24px',
    height: '16px',
    borderRadius: '10px',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    border: '2px solid transparent',
    display: 'flex',
    alignItems: 'center',
    padding: '1px',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
  },
  toggleInner: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'white',
    transition: 'all 0.3s ease',
    transform: 'translateX(0)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    flexShrink: 0,
  },
  toggleInnerActive: {
    transform: 'translateX(8px)',
  },
  digitalSeriesLabel: {
    fontSize: '11px',
    fontWeight: tokens.fontWeightBold,
    marginBottom: '4px',
    color: 'var(--series-color)',
  },
  seriesNumber: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    backgroundColor: '#b8bbb8',
    color: 'white',
    fontSize: '8px',
    fontWeight: 'bold',
    padding: '1px 3px',
    borderRadius: '2px',
    minWidth: '10px',
    lineHeight: '1.4',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  keyboardBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    fontSize: '9px',
    fontWeight: tokens.fontWeightBold,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    padding: '1px 4px',
    borderRadius: tokens.borderRadiusCircular,
    minWidth: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${tokens.colorNeutralBackground1}`,
    boxShadow: tokens.shadow4,
  },
  // seriesInfo: flex:1 column, mirrors Vue .series-info
  seriesItemContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '2px 2px',
    borderRadius: '4px',
  },
  // series-name-line: space-between, mirrors Vue .series-name-line
  seriesItemInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: '24px',
    gap: '4px',
  },
  // name col: flex-shrink, overflow hidden
  seriesItemName: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
    overflow: 'hidden',
    flexShrink: 1,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: '12px',
    color: '#262626',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  // Right group: grid 40px 40px auto — mirrors Vue .series-right-group
  seriesItemMeta: {
    display: 'grid',
    gridTemplateColumns: '40px 40px auto',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  seriesChipCol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    whiteSpace: 'nowrap',
  },
  seriesTagsCol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    whiteSpace: 'nowrap',
  },
  seriesControlsCol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  seriesItemUnit: {
    fontSize: '9px',
    fontWeight: tokens.fontWeightMedium,
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: '1px 3px',
    borderRadius: '2px',
    border: '1px solid rgba(0,0,0,0.06)',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
  },
  // Grey filled chip — mirrors Vue q-chip color="grey-4" = #e0e0e0, text-color="grey-8" = #616161
  typeChip: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    color: '#616161',
    fontSize: '8px',
    fontWeight: '600',
    padding: '1px 4px',
    borderRadius: '3px',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
  },
  expandButton: {
    minWidth: '16px',
    width: '20px',
    height: '20px',
    padding: '0',
    flexShrink: 0,
    color: '#8c8c8c',
    border: 'none',
    background: 'transparent',
    ':hover': {
      color: '#262626',
      background: 'rgba(0,0,0,0.05)',
    },
  },
  seriesDetails: {
    padding: '4px 8px 4px 5px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '11px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2px 8px',
    color: tokens.colorNeutralForeground2,
  },
  seriesStats: {
    display: 'contents',
  },
  dataSourceIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    marginLeft: 'auto',
  },
  colorBox: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    flexShrink: 0,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  chartViewerContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  chartViewerHeader: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  chartTitle: {
    padding: '12px 16px 8px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '2px 2px',
    flexWrap: 'wrap',
    minHeight: '30px',
  },
  chartContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    padding: '16px',
  },
  oscilloscopeContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    gap: '8px',
  },
  combinedAnalogChart: {
    flex: 1,
    minHeight: '300px',
    position: 'relative',
  },
  channelChart: {
    display: 'flex',
    flexDirection: 'column',
    height: '100px',
    flexShrink: 0,
    position: 'relative',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: '8px',
  },
  lastChannel: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBottom: '8px',
  },
  channelLabel: {
    fontSize: '12px',
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '4px',
    paddingLeft: '8px',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  controlGroupWithIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingLeft: '8px',
    borderLeft: `3px solid ${tokens.colorBrandBackground}`,
    height: '14px',
  },
  timeBaseDropdown: {
    border: 'none',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: 0,
    '& button': {
      border: 'none',
      borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
      borderRadius: 0,
    },
  },
  controlLabel: {
    fontSize: '11px',
    fontWeight: tokens.fontWeightRegular,
    whiteSpace: 'nowrap',
  },
  divider: {
    width: '1px',
    height: '18px',
    backgroundColor: tokens.colorNeutralStroke1,
    flexShrink: 0,
  },
  statusTags: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusTag: {
    padding: '2px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    border: '1px solid',
    transition: 'all 0.2s ease',
  },
  statusTagLive: {
    backgroundColor: '#f6ffed',
    border: '1px solid #b7eb8f',
    color: '#389e0d',
  },
  statusTagHistorical: {
    backgroundColor: '#e6f7ff',
    border: '1px solid #91d5ff',
    color: '#0958d9',
  },
  statusTagTimeBase: {
    backgroundColor: '#f5f5f5',
    border: '1px solid #d9d9d9',
    color: '#595959',
  },
  liveIndicator: {
    fontSize: '10px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  spacer: {
    flex: 1,
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
  },
  emptyStateCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    flexDirection: 'column',
    gap: '16px',
  },
  resizer: {
    width: '4px',
    cursor: 'col-resize',
    backgroundColor: '#e1e1e1',
    transition: 'background-color 0.2s',
    flexShrink: 0,
    '&:hover': {
      backgroundColor: '#0078d4',
    },
  },
  clickableCursor: {
    cursor: 'pointer',
  },
  dbTooltipContent: {
    maxWidth: '280px',
  },
  dbTooltipTitle: {
    fontWeight: 600,
    marginBottom: '4px',
  },
  dbTooltipMessage: {
    fontSize: '12px',
  },
  dbTooltipHint: {
    fontSize: '11px',
    color: '#aaa',
    marginTop: '6px',
  },
  dbBadge: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'default',
    border: '1px solid',
  },
  dbBadgeError: {
    backgroundColor: '#fff1f0',
    border: '1px solid #ffa39e',
    color: '#cf1322',
  },
  dbBadgeWarn: {
    backgroundColor: '#fffbe6',
    border: '1px solid #ffe58f',
    color: '#d46b08',
  },
  selectedSeriesItem: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  removeTrackingButton: {
    position: 'absolute',
    top: '4px',
    right: '28px',
    minWidth: '20px',
    width: '20px',
    height: '20px',
    padding: 0,
    zIndex: 2,
  },
  colorIndicatorWrap: {
    position: 'relative',
    flexShrink: 0,
    marginLeft: '6px',
  },
  seriesNameHidden: {
    opacity: 0.4,
  },
  seriesMetaValue: {
    color: tokens.colorNeutralForeground2,
    fontWeight: 600,
    marginLeft: '4px',
  },
  emptyStateCompact: {
    padding: '24px 12px',
    textAlign: 'center',
  },
  iconLarge: {
    fontSize: '40px',
  },
  iconMedium: {
    fontSize: '32px',
  },
  iconSmall: {
    fontSize: '20px',
  },
  mt4: { marginTop: '4px' },
  mt8: { marginTop: '8px' },
  mt12: { marginTop: '12px' },
  mt16: { marginTop: '16px' },
  textMuted: {
    color: tokens.colorNeutralForeground3,
  },
  dialogSurfaceSmall: {
    maxWidth: '360px',
  },
  dialogSurfaceConfig: {
    maxWidth: '760px',
  },
  dialogSurfaceSelector: {
    maxWidth: '460px',
    maxHeight: '80vh',
  },
  stackCol12: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stackCol16: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  stackCol10: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  rowWrap6: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  rowWrap8: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  rowBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  sectionCard: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '6px',
    padding: '8px 10px',
  },
  radioGroupWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  drawerRadioGroup: {
    '& .fui-Radio__label': {
      fontSize: '11px',
    },
  },
  cleanupUnit: {
    minWidth: '80px',
  },
  gridTwoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  fieldLabel: {
    display: 'block',
    marginBottom: '4px',
  },
  fieldLabelWide: {
    display: 'block',
    marginBottom: '6px',
  },
  inputFull: {
    width: '100%',
  },
  inputSmall: {
    width: '80px',
  },
  rowEnd: {
    display: 'flex',
    alignItems: 'end',
  },
  loadingRow: {
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successText: {
    display: 'block',
    marginTop: '8px',
    color: tokens.colorStatusSuccessForeground1,
  },
  warningText: {
    color: tokens.colorStatusWarningForeground1,
    display: 'block',
    marginTop: '6px',
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '190px',
    overflowY: 'auto',
  },
  fileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    padding: '6px 8px',
    alignItems: 'center',
  },
  minWidthZero: {
    minWidth: 0,
  },
  ellipsisText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  shortcutsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px 12px',
    fontSize: '11px',
    marginTop: '6px',
  },
  shortcutCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  smallSwitch: {
    transform: 'scale(0.72)',
    transformOrigin: 'right center',
  },
  keycap: {
    background: '#f0f0f0',
    padding: '1px 5px',
    borderRadius: '3px',
    border: '1px solid #ccc',
  },
  selectorContent: {
    overflowY: 'auto',
    maxHeight: '380px',
  },
  selectorHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  selectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  selectorColor: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    flexShrink: 0,
    backgroundColor: 'var(--series-color)',
  },
  color0: { backgroundColor: '#FF0000' },
  color1: { backgroundColor: '#0000FF' },
  color2: { backgroundColor: '#00AA00' },
  color3: { backgroundColor: '#FF8000' },
  color4: { backgroundColor: '#AA00AA' },
  color5: { backgroundColor: '#CC6600' },
  color6: { backgroundColor: '#AA0000' },
  color7: { backgroundColor: '#0066AA' },
  color8: { backgroundColor: '#AA6600' },
  color9: { backgroundColor: '#6600AA' },
  color10: { backgroundColor: '#006600' },
  color11: { backgroundColor: '#FF6600' },
  color12: { backgroundColor: '#0000AA' },
  color13: { backgroundColor: '#FF00FF' },
  color14: { backgroundColor: '#008080' },
  color15: { backgroundColor: '#800080' },
  color16: { backgroundColor: '#808000' },
  color17: { backgroundColor: '#FF1493' },
  color18: { backgroundColor: '#4B0082' },
  color19: { backgroundColor: '#DC143C' },
  color20: { backgroundColor: '#00AAAA' },
  color21: { backgroundColor: '#00CED1' },
  color22: { backgroundColor: '#8B4513' },
  color23: { backgroundColor: '#2F4F4F' },
  color24: { backgroundColor: '#B22222' },
  colorHidden: { backgroundColor: '#d9d9d9' },
  colorFallback: { backgroundColor: '#999999' },
  unitColor0: { color: '#FF0000' },
  unitColor1: { color: '#0000FF' },
  unitColor2: { color: '#00AA00' },
  unitColor3: { color: '#FF8000' },
  unitColor4: { color: '#AA00AA' },
  unitColor5: { color: '#CC6600' },
  unitColor6: { color: '#AA0000' },
  unitColor7: { color: '#0066AA' },
  unitColor8: { color: '#AA6600' },
  unitColor9: { color: '#6600AA' },
  unitColor10: { color: '#006600' },
  unitColor11: { color: '#FF6600' },
  unitColor12: { color: '#0000AA' },
  unitColor13: { color: '#FF00FF' },
  unitColor14: { color: '#008080' },
  unitColor15: { color: '#800080' },
  unitColor16: { color: '#808000' },
  unitColor17: { color: '#FF1493' },
  unitColor18: { color: '#4B0082' },
  unitColor19: { color: '#DC143C' },
  unitColor20: { color: '#00AAAA' },
  unitColor21: { color: '#00CED1' },
  unitColor22: { color: '#8B4513' },
  unitColor23: { color: '#2F4F4F' },
  unitColor24: { color: '#B22222' },
  unitColorFallback: { color: '#595959' },
});

export interface TrendChartContentProps {
  serialNumber?: number;
  panelId?: number;
  trendlogId?: string;
  monitorId?: string; // Currently unused but may be needed for future multi-monitor support
  itemData?: any; // Complete monitor configuration data (Vue pattern: { title, t3Entry })
  monitorInputs?: any[]; // Monitor inputs for the selected trendlog
  isDrawerMode?: boolean;
  onToolbarRender?: (toolbar: React.ReactNode) => void;
  onBack?: () => void;
}

type TimeBase = '5m' | '10m' | '30m' | '1h' | '4h' | '12h' | '1d' | '4d' | 'custom';
const TIMEBASE_LABELS: Record<string, string> = {
  '5m': '5 minutes', '10m': '10 minutes', '30m': '30 minutes', '1h': '1 hour',
  '4h': '4 hours', '12h': '12 hours', '1d': '1 day', '4d': '4 days', 'custom': 'Custom',
};

interface DatabasePartitionConfig {
  id?: number;
  strategy: 'FiveMinutes' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Custom' | 'CustomMonths';
  custom_days?: number | null;
  custom_months?: number | null;
  auto_cleanup_enabled: boolean;
  retention_value: number;
  retention_unit: 'Days' | 'Weeks' | 'Months';
  is_active: boolean;
}

interface DatabaseFileInfo {
  id: number;
  name: string;
  size: string;
  records: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  is_archived: boolean;
  partition_identifier?: string | null;
  age_days: number;
}

interface CleanupResult {
  files_deleted?: number;
  space_saved?: string;
  message?: string;
}

// Color palette - Cyan at position 20 per user requirement
const CHART_COLORS = [
  '#FF0000',
  '#0000FF',
  '#00AA00',
  '#FF8000',
  '#AA00AA',
  '#CC6600',
  '#AA0000',
  '#0066AA',
  '#AA6600',
  '#6600AA',
  '#006600',
  '#FF6600',
  '#0000AA',
  '#FF00FF',
  '#008080',
  '#800080',
  '#808000',
  '#FF1493',
  '#4B0082',
  '#DC143C',
  '#00AAAA',
  '#00CED1',
  '#8B4513',
  '#2F4F4F',
  '#B22222',
];

export const TrendChartContent: React.FC<TrendChartContentProps> = (props) => {
  const styles = useStyles();
  const { selectedDevice } = useDeviceTreeStore();

  const getColorClass = useCallback((color: string, hidden = false) => {
    if (hidden) {
      return styles.colorHidden;
    }

    switch ((color || '').toUpperCase()) {
      case '#FF0000': return styles.color0;
      case '#0000FF': return styles.color1;
      case '#00AA00': return styles.color2;
      case '#FF8000': return styles.color3;
      case '#AA00AA': return styles.color4;
      case '#CC6600': return styles.color5;
      case '#AA0000': return styles.color6;
      case '#0066AA': return styles.color7;
      case '#AA6600': return styles.color8;
      case '#6600AA': return styles.color9;
      case '#006600': return styles.color10;
      case '#FF6600': return styles.color11;
      case '#0000AA': return styles.color12;
      case '#FF00FF': return styles.color13;
      case '#008080': return styles.color14;
      case '#800080': return styles.color15;
      case '#808000': return styles.color16;
      case '#FF1493': return styles.color17;
      case '#4B0082': return styles.color18;
      case '#DC143C': return styles.color19;
      case '#00AAAA': return styles.color20;
      case '#00CED1': return styles.color21;
      case '#8B4513': return styles.color22;
      case '#2F4F4F': return styles.color23;
      case '#B22222': return styles.color24;
      default: return styles.colorFallback;
    }
  }, [styles]);

  const getUnitColorClass = useCallback((color: string) => {
    switch ((color || '').toUpperCase()) {
      case '#FF0000': return styles.unitColor0;
      case '#0000FF': return styles.unitColor1;
      case '#00AA00': return styles.unitColor2;
      case '#FF8000': return styles.unitColor3;
      case '#AA00AA': return styles.unitColor4;
      case '#CC6600': return styles.unitColor5;
      case '#AA0000': return styles.unitColor6;
      case '#0066AA': return styles.unitColor7;
      case '#AA6600': return styles.unitColor8;
      case '#6600AA': return styles.unitColor9;
      case '#006600': return styles.unitColor10;
      case '#FF6600': return styles.unitColor11;
      case '#0000AA': return styles.unitColor12;
      case '#FF00FF': return styles.unitColor13;
      case '#008080': return styles.unitColor14;
      case '#800080': return styles.unitColor15;
      case '#808000': return styles.unitColor16;
      case '#FF1493': return styles.unitColor17;
      case '#4B0082': return styles.unitColor18;
      case '#DC143C': return styles.unitColor19;
      case '#00AAAA': return styles.unitColor20;
      case '#00CED1': return styles.unitColor21;
      case '#8B4513': return styles.unitColor22;
      case '#2F4F4F': return styles.unitColor23;
      case '#B22222': return styles.unitColor24;
      default: return styles.unitColorFallback;
    }
  }, [styles]);

  // Use props or selected device
  const serialNumber = props.serialNumber || selectedDevice?.serialNumber;
  const panelId = props.panelId || selectedDevice?.panelId || 1;
  const trendlogId = props.trendlogId || '0';
  const isDrawerMode = props.isDrawerMode || false;
  const onToolbarRender = props.onToolbarRender;

  // monitorId may be used in future for multi-monitor support
  // const monitorId = props.monitorId || '0';

  // ── State ──────────────────────────────────────────────────────────────
  const [series, setSeries] = useState<TrendSeries[]>([]);
  const [timeBase, setTimeBase] = useState<TimeBase>('5m');
  const [showGrid] = useState(true);
  const [isRealtime, setIsRealtime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [currentView, setCurrentView] = useState<1 | 2 | 3>(1);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [dataSource, setDataSource] = useState<'realtime' | 'api' | 'loading' | 'error'>('loading');
  const [timeOffset, setTimeOffset] = useState(0); // minutes from now (0 = live, negative = past)
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Custom date range
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartInput, setCustomStartInput] = useState('');
  const [customEndInput, setCustomEndInput] = useState('');
  const [customRangeMs, setCustomRangeMs] = useState<{ start: number; end: number } | null>(null);

  // View 2 & 3 tracking
  const [viewTrackedKeys, setViewTrackedKeys] = useState<{ 2: string[]; 3: string[] }>({ 2: [], 3: [] });
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectorDraftKeys, setSelectorDraftKeys] = useState<string[]>([]);

  // Keyboard shortcuts
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);

  // Config modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [dbConfigLoading, setDbConfigLoading] = useState(false);
  const [dbConfigSaving, setDbConfigSaving] = useState(false);
  const [dbConfigMessage, setDbConfigMessage] = useState<string | null>(null);
  const [syncConfigLoading, setSyncConfigLoading] = useState(false);
  const [syncConfigSaving, setSyncConfigSaving] = useState(false);
  const [ffiSyncIntervalSecs, setFfiSyncIntervalSecs] = useState(900);
  const [rediscoverIntervalSecs, setRediscoverIntervalSecs] = useState(3600);
  const [ffiIntervalPreset, setFfiIntervalPreset] = useState<'15min' | '20min' | '30min' | '60min' | 'custom'>('15min');
  const [ffiCustomMinutes, setFfiCustomMinutes] = useState(15);
  const [ffiSyncWarning, setFfiSyncWarning] = useState<string | null>(null);
  const [rediscoverIntervalPreset, setRediscoverIntervalPreset] = useState<'1hour' | '2hours' | '4hours' | '8hours' | 'custom'>('1hour');
  const [rediscoverCustomHours, setRediscoverCustomHours] = useState(1);
  const [rediscoverWarning, setRediscoverWarning] = useState<string | null>(null);
  const [dbFilesLoading, setDbFilesLoading] = useState(false);
  const [dbConfig, setDbConfig] = useState<DatabasePartitionConfig>({
    strategy: 'Monthly',
    custom_days: 30,
    custom_months: 2,
    auto_cleanup_enabled: true,
    retention_value: 30,
    retention_unit: 'Days',
    is_active: true,
  });
  const [dbFiles, setDbFiles] = useState<DatabaseFileInfo[]>([]);
  const [dbActionBusy, setDbActionBusy] = useState<string | null>(null);

  // DB status
  const [dbStatus, setDbStatus] = useState<{ visible: boolean; severity: 'error' | 'warn'; title: string; message: string } | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataTimestampRef = useRef<number>(0);
  const timebaseChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const historyAbortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedInitialDataRef = useRef<boolean>(false);
  const chartInstanceRef = useRef<any>(null);
  const seriesRef = useRef<TrendSeries[]>([]);
  const timeBaseRef = useRef<TimeBase>('5m');
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dbStatusPollRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state (for stale-closure-free interval callbacks)
  useEffect(() => { seriesRef.current = series; }, [series]);
  useEffect(() => { timeBaseRef.current = timeBase; }, [timeBase]);

  /**
   * Computed: Series displayed in current view (filtered for View 2 & 3)
   */
  const displayedSeries = useMemo(() => {
    if (currentView === 1) return series;
    const tracked = viewTrackedKeys[currentView as 2 | 3];
    return series.filter((s) => tracked.includes(`${s.pointId}-${s.pointIndex}`));
  }, [series, currentView, viewTrackedKeys]);

  /**
   * Computed: Has any tracked items for View 2 or 3
   */
  const hasTrackedItems = useMemo(() => {
    if (currentView === 1) return true;
    return viewTrackedKeys[currentView as 2 | 3].length > 0;
  }, [currentView, viewTrackedKeys]);

  /**
   * Computed: Distinct units across all series (for By Unit dropdown)
   */
  const distinctUnits = useMemo((): Map<string, { count: number; allEnabled: boolean }> => {
    const map = new Map<string, { count: number; allEnabled: boolean }>();
    series.forEach((s) => {
      const unit = s.unit || 'N/A';
      if (!map.has(unit)) map.set(unit, { count: 0, allEnabled: true });
      const entry = map.get(unit)!;
      entry.count += 1;
      if (!s.visible) entry.allEnabled = false;
    });
    return map;
  }, [series]);

  /**
   * Helper: Toggle series expansion
   */
  const toggleSeriesExpand = useCallback((seriesKey: string) => {
    setExpandedSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesKey)) {
        newSet.delete(seriesKey);
      } else {
        newSet.add(seriesKey);
      }
      return newSet;
    });
  }, []);

  /**
   * Helper: Get prefix tag for series (updated from Vue)
   */
  const getPrefixTag = useCallback((pointType: string, prefix?: string): string => {
    // Match Vue chips: IN / OUT / VAR labels.
    if (prefix) return prefix;
    const pt = (pointType || '').toUpperCase();
    if (pt === 'INPUT') return 'IN';
    if (pt === 'OUTPUT') return 'OUT';
    if (pt === 'VARIABLE') return 'VAR';
    return pointType || 'N/A';
  }, []);

  /**
   * Helper: Format Date to local time string for API (backend stores in local time)
   */
  const formatLocalTime = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }, []);

  /**
   * Helper: Get time range in minutes for a given TimeBase
   */
  const getTimeRangeMinutes = useCallback((tb: TimeBase): number => {
    const map: Record<TimeBase, number> = {
      '5m': 5, '10m': 10, '30m': 30, '1h': 60,
      '4h': 240, '12h': 720, '1d': 1440, '4d': 5760, 'custom': 0,
    };
    return map[tb];
  }, []);

  /**
   * Restore live mode - reset timeOffset and enable realtime
   */
  const restoreLiveMode = useCallback(() => {
    setTimeOffset(0);
    setIsRealtime(true);
    setCustomRangeMs(null);
  }, []);

  /**
   * Toggle series visibility by unit
   */
  const toggleByUnit = useCallback((unit: string) => {
    setSeries((prev) => {
      const unitSeries = prev.filter((s) => (s.unit || 'N/A') === unit);
      const allEnabled = unitSeries.every((s) => s.visible);
      return prev.map((s) => (s.unit || 'N/A') === unit ? { ...s, visible: !allEnabled } : s);
    });
  }, []);

  /**
   * View 2 & 3 tracking handlers
   */
  const openItemSelector = useCallback(() => {
    setSelectorDraftKeys(viewTrackedKeys[currentView as 2 | 3]);
    setShowItemSelector(true);
  }, [currentView, viewTrackedKeys]);

  const applyItemSelection = useCallback(() => {
    setViewTrackedKeys((prev) => ({ ...prev, [currentView]: selectorDraftKeys }));
    setShowItemSelector(false);
  }, [currentView, selectorDraftKeys]);

  const removeFromTracking = useCallback((key: string) => {
    setViewTrackedKeys((prev) => ({
      ...prev,
      [currentView]: (prev[currentView as 2 | 3] || []).filter((k) => k !== key),
    }));
  }, [currentView]);

  /**
   * Custom date range handlers
   */
  const applyCustomDateRange = useCallback(() => {
    if (!customStartInput || !customEndInput) return;
    const start = new Date(customStartInput).getTime();
    const end = new Date(customEndInput).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return;
    setCustomRangeMs({ start, end });
    setTimeBase('custom');
    setIsRealtime(false);
    setShowCustomDateModal(false);
  }, [customStartInput, customEndInput]);

  const setQuickRange = useCallback((preset: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek') => {
    const now = new Date();
    let start: Date, end: Date;
    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start.getTime() + 86400000 - 1);
    } else if (preset === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(start.getTime() + 86400000 - 1);
    } else if (preset === 'thisWeek') {
      const day = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      end = new Date(now);
    } else {
      const day = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 7);
      end = new Date(start.getTime() + 7 * 86400000 - 1);
    }
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    setCustomStartInput(fmt(start));
    setCustomEndInput(fmt(end));
  }, []);

  /**
   * Scroll time window left (backward in time).
   * If in live mode, exits live mode first then scrolls.
   */
  const moveTimeLeft = useCallback(() => {
    if (isRealtime) {
      setIsRealtime(false);
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
    }
    const shiftMinutes = getTimeRangeMinutes(timeBase);
    setTimeOffset(prev => prev - shiftMinutes);
  }, [timeBase, isRealtime, getTimeRangeMinutes]);

  /**
   * Scroll time window right (forward in time, capped at live/0)
   */
  const moveTimeRight = useCallback(() => {
    if (isRealtime) return;
    const shiftMinutes = getTimeRangeMinutes(timeBase);
    const newOffset = Math.min(0, timeOffset + shiftMinutes);
    if (newOffset === 0) {
      restoreLiveMode();
      return;
    }
    setTimeOffset(newOffset);
  }, [timeBase, isRealtime, timeOffset, getTimeRangeMinutes, restoreLiveMode]);

  /**
   * Helper: Get existing data time range to optimize loading
   */
  const getExistingDataTimeRange = useCallback(() => {
    let earliest = Infinity;
    let latest = -Infinity;
    let totalPoints = 0;

    series.forEach((s) => {
      s.data.forEach((point) => {
        if (point.timestamp < earliest) earliest = point.timestamp;
        if (point.timestamp > latest) latest = point.timestamp;
        totalPoints++;
      });
    });

    if (totalPoints === 0) return null;
    return { earliest, latest, totalPoints };
  }, [series]);

  /**
   * Load historical data from database (enhanced with Vue flow logic)
   */
  const loadHistoricalData = useCallback(async (forceReload = false) => {
    if (!serialNumber || !panelId) {
      console.warn('鈿狅笍 TrendChartContent: Missing serialNumber or panelId');
      return;
    }

    // Use ref to avoid stale closure 鈥?seriesRef is updated synchronously in initializeSeries
    const currentSeries = seriesRef.current;
    if (currentSeries.length === 0) {
      console.warn('鈿狅笍 TrendChartContent: No series initialized yet');
      return;
    }

    setLoading(true);

    try {
      // Calculate time range based on timeBase (adjusted by timeOffset for historical navigation)
      const now = Date.now() + timeOffset * 60 * 1000;
      const customDurationMs = customRangeMs ? customRangeMs.end - customRangeMs.start : 60 * 60 * 1000;
      const timeRanges: Record<TimeBase, number> = {
        '5m': 5 * 60 * 1000,
        '10m': 10 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '4d': 4 * 24 * 60 * 60 * 1000,
        'custom': customDurationMs,
      };

      const timeRangeMs = timeRanges[timeBase];
      let startTime = now - timeRangeMs;
      let endTime = now;

      // 馃啎 SMART LOADING: Check if we already have data in this time range (skip when force reload)
      const existingRange = forceReload ? null : getExistingDataTimeRange();
      if (existingRange) {
        console.log('馃搳 TrendChartContent: Existing data detected - optimizing load range', {
          requestedRange: {
            start: new Date(startTime).toISOString(),
            end: new Date(endTime).toISOString(),
          },
          existingRange: {
            start: new Date(existingRange.earliest).toISOString(),
            end: new Date(existingRange.latest).toISOString(),
          },
        });

        // Only load data BEFORE the earliest existing point (historical gap)
        if (startTime < existingRange.earliest) {
          endTime = existingRange.earliest - 1000; // 1 second before earliest
          console.log('馃攳 TrendChartContent: Loading historical gap BEFORE existing data', {
            gapStart: new Date(startTime).toISOString(),
            gapEnd: new Date(endTime).toISOString(),
          });
        } else {
          console.log('TrendChartContent: All requested data already exists in memory - skipping database load');
          setLoading(false);
          return;
        }
      }

      // Build request (use local time to match backend storage)
      const request: TrendDataRequest = {
        serial_number: serialNumber,
        panel_id: panelId,
        trendlog_id: trendlogId,
        start_time: formatLocalTime(new Date(startTime)),
        end_time: formatLocalTime(new Date(endTime)),
        limit: 10000,
        point_types: ['INPUT', 'OUTPUT', 'VARIABLE', 'MONITOR'],
        specific_points: currentSeries.map((s) => ({
          point_id: s.pointId,
          point_type: s.pointType,
          point_index: s.pointIndex, // Already 1-based from monitor config
          panel_id: s.panelId || panelId, // Use series-specific panelId for multi-panel support
        })),
      };

      console.log('馃摜 TrendChartContent: Fetching historical data', request);

      const response = await TrendChartApiService.getTrendHistory(request);

      console.log('TrendChartContent: Historical data received', {
        totalRecords: response.total_records,
        dataPoints: response.data.length,
      });

      // Process and MERGE data into series (don't replace)
      const updatedSeries = [...seriesRef.current]; // Use ref for latest state
      response.data.forEach((point) => {
        const seriesIndex = updatedSeries.findIndex(
          (s) => s.pointId === point.point_id && s.pointType === point.point_type
        );
        if (seriesIndex !== -1) {
          const unitFromHistory = String(
            point.unit ?? point.units ?? point.range_field ?? point.range ?? ''
          ).trim();

          const currentUnit = String(updatedSeries[seriesIndex].unit || '').trim();
          const shouldReplaceUnit =
            !currentUnit || currentUnit === 'N/A' || currentUnit.toLowerCase() === 'unused';
          if (shouldReplaceUnit && unitFromHistory) {
            updatedSeries[seriesIndex].unit = unitFromHistory;
          }

          const rawDa = point.digitalAnalog ?? point.digital_analog;
          if (typeof rawDa === 'string') {
            const lower = rawDa.toLowerCase();
            if (lower.includes('digital') || lower === '0') {
              updatedSeries[seriesIndex].digitalAnalog = 'Digital';
            } else if (lower.includes('analog') || lower === '1') {
              updatedSeries[seriesIndex].digitalAnalog = 'Analog';
            }
          } else if (typeof rawDa === 'number') {
            updatedSeries[seriesIndex].digitalAnalog = rawDa === 0 ? 'Digital' : 'Analog';
          }

          // Off/On-like unit labels imply digital state mapping.
          if (unitFromHistory.includes('/')) {
            updatedSeries[seriesIndex].digitalAnalog = 'Digital';
          }

          const timestamp = new Date(point.timestamp).getTime();

          // Check if this timestamp already exists (deduplication)
          const exists = updatedSeries[seriesIndex].data.some((d) => d.timestamp === timestamp);
          if (!exists) {
            updatedSeries[seriesIndex].data.push({
              timestamp,
              value: point.value,
            });
          }

          // Track latest timestamp
          if (timestamp > lastDataTimestampRef.current) {
            lastDataTimestampRef.current = timestamp;
          }
        }
      });

      // Sort data by timestamp after merge
      updatedSeries.forEach((s) => {
        s.data.sort((a, b) => a.timestamp - b.timestamp);
      });

      setSeries(updatedSeries);
      setDataSource('api'); // Track that data came from API
    } catch (error) {
      console.error('TrendChartContent: Failed to load historical data', error);
      setDataSource('error');
    } finally {
      setLoading(false);
    }
  }, [serialNumber, panelId, trendlogId, timeBase, getExistingDataTimeRange, timeOffset, formatLocalTime]);

  /**
   * Initialize series from monitor configuration (enhanced with itemData support)
   */
  const initializeSeries = useCallback(async () => {
    if (!serialNumber || !panelId) return;

    try {
      // Priority 1: Use monitorInputs if provided (from TrendLogs page selection)
      if (props.monitorInputs && props.monitorInputs.length > 0) {
        console.log('鉁?TrendChartContent: Initializing series from monitorInputs', {
          inputCount: props.monitorInputs.length,
          sampleInput: props.monitorInputs[0],
          serialNumber,
          panelId,
        });

        // Fetch all point data once for each type
        const pointsCache: Record<string, any[]> = {};

        try {
          // Determine which point types we need
          const neededTypes = new Set(props.monitorInputs.map(input =>
            input.pointType === 'IN' ? 'INPUT' :
            input.pointType === 'OUT' ? 'OUTPUT' :
            'VARIABLE'
          ));

          // Fetch each type once
          const fetchPromises = Array.from(neededTypes).map(async (pointTypeStr) => {
            const endpoint = pointTypeStr === 'INPUT' ? 'input-points' :
                           pointTypeStr === 'OUTPUT' ? 'output-points' :
                           'variable-points';
            const pointUrl = `${API_BASE_URL}/api/t3_device/devices/${serialNumber}/${endpoint}`;

            console.log(`馃摗 Fetching ${pointTypeStr} points from:`, pointUrl);
            const response = await fetch(pointUrl);

            if (response.ok) {
              const data = await response.json();
              const pointsKey = pointTypeStr === 'INPUT' ? 'input_points' :
                              pointTypeStr === 'OUTPUT' ? 'output_points' :
                              'variable_points';
              pointsCache[pointTypeStr] = data[pointsKey] || [];
              console.log(`鉁?Fetched ${pointsCache[pointTypeStr].length} ${pointTypeStr} points`);
            } else {
              console.error(`鉂?Failed to fetch ${pointTypeStr} points:`, response.status);
              pointsCache[pointTypeStr] = [];
            }
          });

          await Promise.all(fetchPromises);
        } catch (err) {
          console.error('鉂?Error fetching point data:', err);
        }

        // Now create series using the cached data
        const generatedSeries: TrendSeries[] = props.monitorInputs.map((input, index) => {
          // TRENDLOG_INPUTS.Point_Type is stored as "INPUT"/"OUTPUT"/"VARIABLE" (full name)
          // but may also arrive as legacy short form "IN"/"OUT"/"VAR" 鈥?handle both
          const rawType = input.pointType || '';
          const pointTypeStr: 'INPUT' | 'OUTPUT' | 'VARIABLE' =
            (rawType === 'INPUT' || rawType === 'IN') ? 'INPUT' :
            (rawType === 'OUTPUT' || rawType === 'OUT') ? 'OUTPUT' :
            (rawType === 'VARIABLE' || rawType === 'VAR') ? 'VARIABLE' : 'INPUT';
          // Derive the short prefix used in PointId ("IN1", "OUT1", "VAR1")
          const pointPrefix = pointTypeStr === 'INPUT' ? 'IN' : pointTypeStr === 'OUTPUT' ? 'OUT' : 'VAR';

          // TRENDLOG_INPUTS.Point_Index is 0-based (from C++ point_number).
          // TRENDLOG_DATA.PointId is 1-based (e.g., "IN1" for C++ index 0).
          // 鈫?rawIndex is used for cache lookup; pointId uses rawIndex+1
          const rawIndex = parseInt(input.pointIndex, 10);   // 0-based
          const pointIndex = rawIndex + 1;                   // 1-based, matches TRENDLOG_DATA.PointId
          const pointId = `${pointPrefix}${pointIndex}`;     // e.g., "IN1", "OUT2", "VAR3"

          // Look up point metadata from cached data (InputIndex/OutputIndex/VariableIndex are 0-based)
          let digitalAnalog: 'Digital' | 'Analog' = 'Analog'; // Default
          const points = pointsCache[pointTypeStr] || [];
          const point = points.find((p: any) => {
            const pointRawIndex = p.index ?? p.inputIndex ?? p.outputIndex ?? p.variableIndex ?? p.pointIndex ?? 0;
            return parseInt(pointRawIndex, 10) === rawIndex;
          });

          const unitRaw = (point?.units ?? point?.unit ?? point?.rangeLabel ?? point?.range_field ?? '') as string;
          const resolvedUnit = String(unitRaw || '').trim();

          if (point) {
            const rawValue = point.digitalAnalog ?? point.digital_analog;
            if (typeof rawValue === 'string') {
              const lower = rawValue.toLowerCase();
              if (lower.includes('digital') || lower === '0') digitalAnalog = 'Digital';
              else if (lower.includes('analog') || lower === '1') digitalAnalog = 'Analog';
            } else if (typeof rawValue === 'number') {
              digitalAnalog = rawValue === 0 ? 'Digital' : 'Analog';
            }

            // Vue-compatible fallback: ranges like Off/On are digital states.
            if (resolvedUnit.includes('/')) {
              digitalAnalog = 'Digital';
            }

            console.log(`鉁?[${pointId}] Metadata mapped`, {
              digitalAnalog,
              rawDigitalAnalog: rawValue,
              resolvedUnit,
            });
          }

          return {
            name: input.pointLabel || point?.label || point?.fullLabel || pointId,
            pointId,
            pointType: pointTypeStr,
            pointIndex: pointIndex,
            data: [],
            color: CHART_COLORS[index % CHART_COLORS.length],
            unit: resolvedUnit,
            digitalAnalog,
            visible: true,
            prefix: pointPrefix,
          };
        });

        seriesRef.current = generatedSeries; // Update ref synchronously before setState
        setSeries(generatedSeries);
        console.log('鉁?TrendChartContent: Series initialized from monitorInputs', {
          count: generatedSeries.length,
          serialNumber,
          panelId,
          digitalCount: generatedSeries.filter(s => s.digitalAnalog === 'Digital').length,
          analogCount: generatedSeries.filter(s => s.digitalAnalog === 'Analog').length,
        });
        return;
      }

      // Priority 2: Check if we have itemData with monitor configuration (Vue pattern)
      if (props.itemData?.t3Entry?.input && props.itemData?.t3Entry?.range) {
        const inputData = props.itemData.t3Entry.input;
        const rangeData = props.itemData.t3Entry.range;

        console.log('TrendChartContent: Initializing series from itemData', {
          inputCount: inputData.length,
          rangeCount: rangeData.length,
        });

        // Generate series from monitor configuration
        const generatedSeries: TrendSeries[] = [];
        const itemCount = Math.min(inputData.length, rangeData.length);

        for (let index = 0; index < itemCount; index++) {
          const inputItem = inputData[index];
          const rangeItem = rangeData[index];

          // Extract point information
          const pointType = inputItem.point_type; // INPUT=0, OUTPUT=1, VARIABLE=2
          const pointNumber = inputItem.point_number; // 0-based

          // Map point type to string
          const pointTypeStr = pointType === 0 ? 'INPUT' : pointType === 1 ? 'OUTPUT' : 'VARIABLE';
          const pointPrefix = pointType === 0 ? 'IN' : pointType === 1 ? 'OUT' : 'VAR';
          const pointId = `${pointPrefix}${pointNumber + 1}`;

          // Determine analog/digital from range metadata (same heuristics as monitorInputs path)
          const rangeUnit = String(rangeItem.units || rangeItem.unit || '').trim();
          const rawDa = rangeItem.digital_analog ?? rangeItem.digitalAnalog;
          let digitalAnalog: 'Analog' | 'Digital' = 'Analog';
          if (typeof rawDa === 'string') {
            const lower = rawDa.toLowerCase();
            if (lower.includes('digital') || lower === '0') digitalAnalog = 'Digital';
            else if (lower.includes('analog') || lower === '1') digitalAnalog = 'Analog';
          } else if (typeof rawDa === 'number') {
            digitalAnalog = rawDa === 0 ? 'Digital' : 'Analog';
          }
          if (rangeUnit.includes('/')) {
            digitalAnalog = 'Digital';
          }

          generatedSeries.push({
            name: pointId,
            pointId,
            pointType: pointTypeStr,
            pointIndex: pointNumber + 1, // Convert to 1-based for API
            data: [],
            color: CHART_COLORS[index % CHART_COLORS.length],
            unit: rangeUnit,
            digitalAnalog: digitalAnalog as 'Analog' | 'Digital',
            visible: true,
            prefix: pointPrefix,
          });
        }

        seriesRef.current = generatedSeries; // Update ref synchronously before setState
        setSeries(generatedSeries);
        console.log('TrendChartContent: Series initialized from itemData', {
          count: generatedSeries.length,
          serialNumber,
          panelId,
        });
        return;
      }

      // Fallback: Create sample series if no itemData
      console.log('鈿狅笍 TrendChartContent: No itemData available, using sample series');
      const sampleSeries: TrendSeries[] = [
        {
          name: 'IN1',
          pointId: 'IN1',
          pointType: 'INPUT',
          pointIndex: 1, // 1-based
          data: [],
          color: CHART_COLORS[0],
          unit: '掳C',
          digitalAnalog: 'Analog',
          visible: true,
        },
        {
          name: 'IN2',
          pointId: 'IN2',
          pointType: 'INPUT',
          pointIndex: 2,
          data: [],
          color: CHART_COLORS[1],
          unit: '掳C',
          digitalAnalog: 'Analog',
          visible: true,
        },
        {
          name: 'OUT1',
          pointId: 'OUT1',
          pointType: 'OUTPUT',
          pointIndex: 1,
          data: [],
          color: CHART_COLORS[2],
          unit: '%',
          digitalAnalog: 'Analog',
          visible: true,
        },
      ];

      setSeries(sampleSeries);

      console.log('TrendChartContent: Series initialized', {
        count: sampleSeries.length,
        serialNumber,
        panelId,
      });
    } catch (error) {
      console.error('TrendChartContent: Failed to initialize series', error);
    }
  }, [serialNumber, panelId, props.itemData, props.monitorInputs]);

  /**
   * Poll latest data from history API (replaces broken realtime endpoint)
   * Uses refs to avoid stale closure issues in setInterval callbacks
   */
  const pollRealtimeData = useCallback(async () => {
    const currentSeries = seriesRef.current;
    if (!serialNumber || !panelId || currentSeries.length === 0) return;

    try {
      const now = Date.now();
      const currentTimeBase = timeBaseRef.current;
      const timeRangeMs: Record<TimeBase, number> = {
        '5m': 5 * 60 * 1000, '10m': 10 * 60 * 1000, '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000, '4h': 4 * 60 * 60 * 1000, '12h': 12 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000, '4d': 4 * 24 * 60 * 60 * 1000, 'custom': 60 * 60 * 1000,
      };
      const startMs = now - timeRangeMs[currentTimeBase];

      const fmt = (date: Date) => {
        const y = date.getFullYear(), mo = String(date.getMonth() + 1).padStart(2, '0'),
          d = String(date.getDate()).padStart(2, '0'), h = String(date.getHours()).padStart(2, '0'),
          mi = String(date.getMinutes()).padStart(2, '0'), s = String(date.getSeconds()).padStart(2, '0');
        return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
      };

      const request: TrendDataRequest = {
        serial_number: serialNumber,
        panel_id: panelId,
        trendlog_id: trendlogId,
        start_time: fmt(new Date(startMs)),
        end_time: fmt(new Date(now)),
        limit: 500,
        point_types: ['INPUT', 'OUTPUT', 'VARIABLE', 'MONITOR'],
        specific_points: currentSeries.map((s) => ({
          point_id: s.pointId,
          point_type: s.pointType,
          point_index: s.pointIndex,
          panel_id: s.panelId || panelId,
        })),
      };

      const response = await TrendChartApiService.getTrendHistory(request);

      if (response.data.length > 0) {
        setSeries(prev => {
          const updated = prev.map(s => ({ ...s, data: [...s.data] }));
          response.data.forEach(point => {
            const idx = updated.findIndex(
              s => s.pointId === point.point_id && s.pointType === point.point_type
            );
            if (idx !== -1) {
              const timestamp = new Date(point.timestamp).getTime();
              const exists = updated[idx].data.some(d => d.timestamp === timestamp);
              if (!exists) {
                updated[idx].data.push({ timestamp, value: point.value });
                updated[idx].data.sort((a, b) => a.timestamp - b.timestamp);
                if (timestamp > lastDataTimestampRef.current) {
                  lastDataTimestampRef.current = timestamp;
                }
              }
            }
          });
          return updated;
        });
        // Track last sync time accurately
        const now = new Date();
        setLastSyncTime(
          `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
        );
        setDataSource('realtime');
      }
    } catch (error) {
      console.error('TrendChartContent: Realtime poll failed', error);
      setDataSource('error');
    }
  }, [serialNumber, panelId, trendlogId]);

  /**
   * Manual refresh: force full reload of historical data
   */
  const manualRefresh = useCallback(async () => {
    await loadHistoricalData(true);
  }, [loadHistoricalData]);

  const getFfiIntervalSecs = useCallback(() => {
    const presetValues: Record<string, number> = {
      '15min': 900,
      '20min': 1200,
      '30min': 1800,
      '60min': 3600,
    };

    if (ffiIntervalPreset !== 'custom') {
      return presetValues[ffiIntervalPreset] || 900;
    }

    return Math.max(1, ffiCustomMinutes) * 60;
  }, [ffiIntervalPreset, ffiCustomMinutes]);

  const getRediscoverIntervalSecs = useCallback(() => {
    const presetValues: Record<string, number> = {
      '1hour': 3600,
      '2hours': 7200,
      '4hours': 14400,
      '8hours': 28800,
    };

    if (rediscoverIntervalPreset !== 'custom') {
      return presetValues[rediscoverIntervalPreset] || 3600;
    }

    return Math.max(1, rediscoverCustomHours) * 3600;
  }, [rediscoverIntervalPreset, rediscoverCustomHours]);

  const checkFfiSyncWarning = useCallback((secs: number) => {
    if (secs < 300) {
      setFfiSyncWarning('Warning: Frequent syncs (< 5 min) may impact performance');
      return;
    }
    if (secs > 3600) {
      setFfiSyncWarning('Warning: Long intervals (> 1 hour) may delay data updates');
      return;
    }
    setFfiSyncWarning(null);
  }, []);

  const checkRediscoverWarning = useCallback((secs: number) => {
    if (secs < 3600) {
      setRediscoverWarning('Warning: Minimum interval is 1 hour');
      return;
    }
    if (secs > 86400) {
      setRediscoverWarning('Warning: Long intervals (> 24 hours) may delay discovery of new devices');
      return;
    }
    setRediscoverWarning(null);
  }, []);

  const loadSyncConfig = useCallback(async () => {
    setSyncConfigLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/config/all`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const ffiSecs = parseInt(data['ffi.sync_interval_secs'] || '900', 10);
      const rediscoverSecs = parseInt(data['rediscover.interval_secs'] || '3600', 10);

      setFfiSyncIntervalSecs(ffiSecs);
      setRediscoverIntervalSecs(rediscoverSecs);

      const ffiPresets: Record<number, '15min' | '20min' | '30min' | '60min'> = {
        900: '15min',
        1200: '20min',
        1800: '30min',
        3600: '60min',
      };
      const ffiPreset = ffiPresets[ffiSecs];
      if (ffiPreset) {
        setFfiIntervalPreset(ffiPreset);
        setFfiCustomMinutes(Math.max(1, Math.floor(ffiSecs / 60)));
      } else {
        setFfiIntervalPreset('custom');
        setFfiCustomMinutes(Math.max(1, Math.floor(ffiSecs / 60)));
      }

      const rediscoverPresets: Record<number, '1hour' | '2hours' | '4hours' | '8hours'> = {
        3600: '1hour',
        7200: '2hours',
        14400: '4hours',
        28800: '8hours',
      };
      const rediscoverPreset = rediscoverPresets[rediscoverSecs];
      if (rediscoverPreset) {
        setRediscoverIntervalPreset(rediscoverPreset);
        setRediscoverCustomHours(Math.max(1, Math.floor(rediscoverSecs / 3600)));
      } else {
        setRediscoverIntervalPreset('custom');
        setRediscoverCustomHours(Math.max(1, Math.floor(rediscoverSecs / 3600)));
      }

      checkFfiSyncWarning(ffiSecs);
      checkRediscoverWarning(rediscoverSecs);
    } catch (error) {
      console.error('TrendChartContent: Failed to load sync config', error);
      setDbConfigMessage('Failed to load sync/rediscover intervals.');
    } finally {
      setSyncConfigLoading(false);
    }
  }, [checkFfiSyncWarning, checkRediscoverWarning]);

  const saveSyncConfig = useCallback(async () => {
    setSyncConfigSaving(true);
    setDbConfigMessage(null);
    try {
      const ffiSecs = getFfiIntervalSecs();
      const rediscoverSecs = getRediscoverIntervalSecs();

      const updates = [
        { key: 'ffi.sync_interval_secs', value: String(ffiSecs) },
        { key: 'rediscover.interval_secs', value: String(rediscoverSecs) },
      ];

      for (const update of updates) {
        const res = await fetch(`${API_BASE_URL}/api/config/${update.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: update.value }),
        });
        if (!res.ok) {
          throw new Error(`Failed saving ${update.key}, HTTP ${res.status}`);
        }
      }

      setFfiSyncIntervalSecs(ffiSecs);
      setRediscoverIntervalSecs(rediscoverSecs);
      checkFfiSyncWarning(ffiSecs);
      checkRediscoverWarning(rediscoverSecs);
      setDbConfigMessage('Sync and rediscover intervals saved.');
    } catch (error) {
      console.error('TrendChartContent: Failed to save sync config', error);
      setDbConfigMessage('Failed to save sync/rediscover intervals.');
    } finally {
      setSyncConfigSaving(false);
    }
  }, [getFfiIntervalSecs, getRediscoverIntervalSecs, checkFfiSyncWarning, checkRediscoverWarning]);

  const loadDatabaseConfig = useCallback(async () => {
    setDbConfigLoading(true);
    setDbConfigMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/database/config`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDbConfig((prev) => ({
        ...prev,
        ...json,
      }));
    } catch (error) {
      console.error('TrendChartContent: Failed to load database config', error);
      setDbConfigMessage('Failed to load database configuration.');
    } finally {
      setDbConfigLoading(false);
    }
  }, []);

  const loadDatabaseFiles = useCallback(async () => {
    setDbFilesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/database/files`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDbFiles(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error('TrendChartContent: Failed to load database files', error);
      setDbConfigMessage('Failed to load database files.');
      setDbFiles([]);
    } finally {
      setDbFilesLoading(false);
    }
  }, []);

  const saveDatabaseConfig = useCallback(async () => {
    setDbConfigSaving(true);
    setDbConfigMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/database/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDbConfig((prev) => ({ ...prev, ...json }));

      const applyRes = await fetch(`${API_BASE_URL}/api/database/partition/apply`, {
        method: 'POST',
      });
      if (!applyRes.ok) {
        throw new Error(`Apply strategy failed, HTTP ${applyRes.status}`);
      }

      setDbConfigMessage('Configuration saved and partitioning applied.');
      await loadDatabaseFiles();
    } catch (error) {
      console.error('TrendChartContent: Failed to save database config', error);
      setDbConfigMessage('Failed to save database configuration.');
    } finally {
      setDbConfigSaving(false);
    }
  }, [dbConfig, loadDatabaseFiles]);

  const cleanupOldDatabaseFiles = useCallback(async () => {
    setDbActionBusy('cleanup-old');
    setDbConfigMessage(null);
    try {
      const unit = (dbConfig.retention_unit || 'Days').toLowerCase();
      const value = Math.max(1, Number(dbConfig.retention_value) || 30);
      const retentionDays = unit === 'weeks' ? value * 7 : unit === 'months' ? value * 30 : value;
      const res = await fetch(`${API_BASE_URL}/api/database/cleanup/old?retention_days=${retentionDays}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: CleanupResult = await res.json();
      setDbConfigMessage(result?.message || 'Old files cleanup completed.');
      await loadDatabaseFiles();
    } catch (error) {
      console.error('TrendChartContent: Failed to cleanup old files', error);
      setDbConfigMessage('Failed to cleanup old files.');
    } finally {
      setDbActionBusy(null);
    }
  }, [dbConfig.retention_unit, dbConfig.retention_value, loadDatabaseFiles]);

  const cleanupAllDatabaseFiles = useCallback(async () => {
    setDbActionBusy('cleanup-all');
    setDbConfigMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/database/cleanup/all`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: CleanupResult = await res.json();
      setDbConfigMessage(result?.message || 'All inactive files cleaned up.');
      await loadDatabaseFiles();
    } catch (error) {
      console.error('TrendChartContent: Failed to cleanup all files', error);
      setDbConfigMessage('Failed to cleanup all files.');
    } finally {
      setDbActionBusy(null);
    }
  }, [loadDatabaseFiles]);

  const deleteDatabaseFile = useCallback(async (fileId: number) => {
    setDbActionBusy(`delete-${fileId}`);
    setDbConfigMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/database/files/${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.success === false) {
        setDbConfigMessage(json?.message || 'Cannot delete this database file.');
      } else {
        setDbConfigMessage('Database file deleted.');
      }
      await loadDatabaseFiles();
    } catch (error) {
      console.error('TrendChartContent: Failed to delete file', error);
      setDbConfigMessage('Failed to delete database file.');
    } finally {
      setDbActionBusy(null);
    }
  }, [loadDatabaseFiles]);

  const optimizeDatabase = useCallback(async () => {
    setDbActionBusy('optimize');
    setDbConfigMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/database/optimize`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDbConfigMessage(json?.message || 'Database optimize request completed.');
      await loadDatabaseFiles();
    } catch (error) {
      console.error('TrendChartContent: Failed to optimize database', error);
      setDbConfigMessage('Failed to optimize database.');
    } finally {
      setDbActionBusy(null);
    }
  }, [loadDatabaseFiles]);

  /**
   * Handle visibility change - backfill missing data
   */
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && isRealtime && lastDataTimestampRef.current > 0) {
        const now = Date.now();
        const gapSeconds = Math.floor((now - lastDataTimestampRef.current) / 1000);

        if (gapSeconds >= 10) {
          console.log('馃攧 TrendChartContent: Backfilling data gap', {
            gapSeconds,
            lastTimestamp: new Date(lastDataTimestampRef.current).toISOString(),
          });
          await loadHistoricalData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRealtime, loadHistoricalData]);

  /**
   * Initialize page - Load initial data once (Vue flow pattern)
   * This mimics Vue's onMounted behavior - runs only once when component mounts
   */
  useEffect(() => {
    const initializeData = async () => {
      console.log('馃殌 TrendChartContent: Starting initialization sequence');

      // Step 1: Initialize series from monitor config (Vue: regenerateDataSeries)
      await initializeSeries();

      console.log('TrendChartContent: Series initialized, waiting for series state update');

      // Wait for series state to be updated before loading data
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('TrendChartContent: Series state updated, loading historical data');

      // Step 2: Load initial historical data (Vue: initializeData -> loadHistoricalDataFromDatabase)
      await loadHistoricalData();

      // Step 3: Mark as initialized
      hasLoadedInitialDataRef.current = true;

      console.log('TrendChartContent: Initialization completed');
    };

    initializeData();
  }, []); // Empty deps - run only once on mount

  useEffect(() => {
    if (!showConfigModal) {
      return;
    }

    loadSyncConfig();
    loadDatabaseConfig();
    loadDatabaseFiles();
  }, [showConfigModal, loadSyncConfig, loadDatabaseConfig, loadDatabaseFiles]);

  /**
   * Watch timeBase changes with debouncing (Vue flow pattern)
   */
  useEffect(() => {
    // Skip if series not initialized yet
    if (series.length === 0) {
      console.log('鈿狅笍 TrendChartContent: No series yet, skipping timebase effect');
      return;
    }

    // Skip if this is the first load and we haven't loaded initial data yet
    if (!hasLoadedInitialDataRef.current) {
      console.log('鈿狅笍 TrendChartContent: Initial data not loaded yet, skipping timebase effect');
      return;
    }

    // Cancel previous pending timebase change
    if (timebaseChangeTimeoutRef.current) {
      clearTimeout(timebaseChangeTimeoutRef.current);
      console.log('鈴革笍 TrendChartContent: Cancelled pending timebase change');
    }

    // Abort any ongoing history API request
    if (historyAbortControllerRef.current) {
      historyAbortControllerRef.current.abort();
      console.log('馃洃 TrendChartContent: Aborted previous history API request');
    }

    // Debounce: wait 300ms before executing
    timebaseChangeTimeoutRef.current = setTimeout(async () => {
      console.log('TrendChartContent: TimeBase changed - loading data', {
        timeBase,
        isRealtime,
        seriesCount: series.length,
      });

      try {
        // Create new abort controller for this request
        historyAbortControllerRef.current = new AbortController();

        // Check if we can reuse existing data
        const existingRange = getExistingDataTimeRange();
        const hasExistingData = existingRange && existingRange.totalPoints > 0;

        if (hasExistingData) {
          console.log('TrendChartContent: Existing data found - merging with historical', {
            existingPoints: existingRange?.totalPoints,
          });
        }

        // Load data based on Auto Scroll state
        if (isRealtime) {
          // Auto Scroll ON: Load real-time + historical data
          console.log('馃搳 TrendChartContent: Auto Scroll ON - Loading historical + starting real-time');
          await loadHistoricalData();

          // Ensure real-time updates are active
          if (!realtimeIntervalRef.current) {
            console.log('馃攧 TrendChartContent: Starting real-time updates');
            realtimeIntervalRef.current = setInterval(pollRealtimeData, 5000);
          }
        } else {
          // Auto Scroll OFF: Load historical data only
          console.log('馃摎 TrendChartContent: Auto Scroll OFF - Loading historical only');

          // Stop real-time updates
          if (realtimeIntervalRef.current) {
            clearInterval(realtimeIntervalRef.current);
            realtimeIntervalRef.current = null;
          }

          await loadHistoricalData();
        }

        console.log('TrendChartContent: Timebase change completed', {
          timeBase,
          isRealtime,
          totalPoints: series.reduce((sum, s) => sum + s.data.length, 0),
        });
      } catch (error: any) {
        // Check if error is due to abort
        if (error.name === 'AbortError') {
          console.log('鈴癸笍 TrendChartContent: History request aborted (newer request started)');
          return;
        }

        console.error('TrendChartContent: Error loading data for new timebase:', error);
        setDataSource('error');
      }
    }, 300); // 300ms debounce delay

    // Cleanup on unmount
    return () => {
      if (timebaseChangeTimeoutRef.current) {
        clearTimeout(timebaseChangeTimeoutRef.current);
      }
      if (historyAbortControllerRef.current) {
        historyAbortControllerRef.current.abort();
      }
    };
  }, [timeBase, isRealtime]);

  /**
   * Start/stop realtime updates when isRealtime changes (Vue: watch(isRealTime))
   */
  useEffect(() => {
    // Only manage interval after initial load is complete
    if (!hasLoadedInitialDataRef.current) {
      console.log('鈴革笍 TrendChartContent: Skipping Auto Scroll effect - not initialized yet');
      return;
    }

    console.log('馃攧 TrendChartContent: Auto Scroll state changed', { isRealtime });

    if (isRealtime) {
      // Start real-time updates
      if (!realtimeIntervalRef.current) {
        console.log('鈻讹笍 TrendChartContent: Starting real-time updates interval');
        realtimeIntervalRef.current = setInterval(() => {
          pollRealtimeData();
        }, 5000);
      }
    } else {
      // Stop real-time updates
      if (realtimeIntervalRef.current) {
        console.log('鈴革笍 TrendChartContent: Stopping real-time updates interval');
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
    };
  }, [isRealtime]); // Only depend on isRealtime, not updateRealtimeData

  /**
   * 30-second loading timeout 鈥?shows timeout empty state
   */
  useEffect(() => {
    if (loading) {
      setLoadingTimedOut(false);
      loadingTimerRef.current = setTimeout(() => setLoadingTimedOut(true), 30000);
    } else {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    }
    return () => { if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current); };
  }, [loading]);

  /**
   * DB Status polling 鈥?every 10 seconds
   */
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/sync/health`);
        if (!res.ok) {
          setDbStatus({ visible: true, severity: 'error', title: 'Center DB Unreachable', message: `HTTP ${res.status}` });
          return;
        }
        const json = await res.json().catch(() => null);
        if (json && json.center_db_status && json.center_db_status !== 'ok') {
          const s = json.center_db_status;
          const sev: 'error' | 'warn' = s === 'server_unreachable' || s === 'db_missing' ? 'error' : 'warn';
          const msgs: Record<string, string> = {
            server_unreachable: 'Cannot reach the Center DB server.',
            db_missing: 'Center DB file is missing.',
            schema_missing: 'Center DB schema is incomplete.',
            misconfigured_backend: 'Backend misconfigured for Center DB.',
          };
          setDbStatus({ visible: true, severity: sev, title: 'Center DB Issue', message: msgs[s] || s });
        } else {
          setDbStatus(null);
        }
      } catch {
        // network error 鈥?not necessarily a DB issue, ignore silently
      }
    };
    poll();
    dbStatusPollRef.current = setInterval(poll, 10000);
    return () => { if (dbStatusPollRef.current) clearInterval(dbStatusPollRef.current); };
  }, []);

  /**
   * Zoom controls
   */
  const timeBaseOrder: TimeBase[] = ['5m', '10m', '30m', '1h', '4h', '12h', '1d', '4d'];

  const zoomIn = useCallback(() => {
    if (timeBase === 'custom') return;
    const currentIndex = timeBaseOrder.indexOf(timeBase);
    if (currentIndex > 0) setTimeBase(timeBaseOrder[currentIndex - 1]);
  }, [timeBase]);

  const zoomOut = useCallback(() => {
    if (timeBase === 'custom') return;
    const currentIndex = timeBaseOrder.indexOf(timeBase);
    if (currentIndex < timeBaseOrder.length - 1) setTimeBase(timeBaseOrder[currentIndex + 1]);
  }, [timeBase]);

  const resetTimeBase = useCallback(() => {
    setTimeOffset(0);
    setIsRealtime(true);
    setTimeBase('5m');
    setCustomRangeMs(null);
  }, []);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    if (!keyboardEnabled) return;
    const KEYS: string[] = ['1','2','3','4','5','6','7','8','9','a','b','c','d','e'];
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const key = e.key.toLowerCase();
      const idx = KEYS.indexOf(key);
      if (idx !== -1) {
        e.preventDefault();
        setSeries(prev => {
          const updated = [...prev];
          if (idx < updated.length) updated[idx] = { ...updated[idx], visible: !updated[idx].visible };
          return updated;
        });
        // lastKeyboardAction intentionally not tracked (display-only feature removed)
      } else if (e.key === 'ArrowLeft') { e.preventDefault(); moveTimeLeft(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveTimeRight(); }
      else if (e.key === 'ArrowUp' && !e.ctrlKey) { e.preventDefault(); zoomIn(); }
      else if (e.key === 'ArrowDown' && !e.ctrlKey) { e.preventDefault(); zoomOut(); }
      else if (e.key === 'ArrowUp' && e.ctrlKey) {
        e.preventDefault();
        setSelectedItemIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' && e.ctrlKey) {
        e.preventDefault();
        setSeries(prev => { setSelectedItemIndex(i => Math.min(prev.length - 1, i + 1)); return prev; });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setSeries(prev => {
          if (selectedItemIndex < 0 || selectedItemIndex >= prev.length) return prev;
          const updated = [...prev];
          updated[selectedItemIndex] = { ...updated[selectedItemIndex], visible: !updated[selectedItemIndex].visible };
          return updated;
        });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setKeyboardEnabled(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keyboardEnabled, moveTimeLeft, moveTimeRight, zoomIn, zoomOut, selectedItemIndex]);

  /**
   * Persist & restore state to localStorage
   */
  const localStorageKey = useMemo(() =>
    serialNumber ? `trendlog_view_state_${serialNumber}_${trendlogId}` : null,
    [serialNumber, trendlogId]);

  useEffect(() => {
    if (!localStorageKey) return;
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.timeBase) setTimeBase(s.timeBase);
        if (typeof s.timeOffset === 'number') setTimeOffset(s.timeOffset);
        if (s.customRangeMs) setCustomRangeMs(s.customRangeMs);
        if (s.viewTrackedKeys) setViewTrackedKeys(s.viewTrackedKeys);
      }
    } catch { /* ignore */ }
  }, [localStorageKey]);

  useEffect(() => {
    if (!localStorageKey) return;
    try {
      localStorage.setItem(localStorageKey, JSON.stringify({ timeBase, timeOffset, customRangeMs, viewTrackedKeys }));
    } catch { /* ignore */ }
  }, [localStorageKey, timeBase, timeOffset, customRangeMs, viewTrackedKeys]);

  /**
   * Toggle series visibility
   */
  const toggleSeriesVisibility = useCallback((index: number, forceValue?: boolean) => {
    setSeries((prev) => {
      const updated = [...prev];
      updated[index].visible = forceValue !== undefined ? forceValue : !updated[index].visible;
      return updated;
    });
  }, []);

  /**
   * Header dropdown handlers - All menu (Enable/Disable All)
   */
  const handleEnableAll = useCallback(() => {
    setSeries((prev) => prev.map((s) => ({ ...s, visible: true })));
  }, []);

  const handleDisableAll = useCallback(() => {
    setSeries((prev) => prev.map((s) => ({ ...s, visible: false })));
  }, []);

  /**
   * Header dropdown handlers - By Type menu
   */
  const toggleByAnalogDigital = useCallback((type: 'Analog' | 'Digital') => {
    setSeries((prev) => {
      const typeSeries = prev.filter((s) => s.digitalAnalog === type);
      const allEnabled = typeSeries.every((s) => s.visible);
      return prev.map((s) =>
        s.digitalAnalog === type ? { ...s, visible: !allEnabled } : s
      );
    });
  }, []);

  const toggleByPointType = useCallback((type: 'INPUT' | 'OUTPUT' | 'VARIABLE') => {
    setSeries((prev) => {
      const typeSeries = prev.filter((s) => s.pointType === type);
      const allEnabled = typeSeries.every((s) => s.visible);
      return prev.map((s) =>
        s.pointType === type ? { ...s, visible: !allEnabled } : s
      );
    });
  }, []);

  /**
   * Computed: Series counts by type for dropdowns
   */
  const seriesCounts = useMemo(() => {
    return {
      analog: series.filter((s) => s.digitalAnalog === 'Analog').length,
      digital: series.filter((s) => s.digitalAnalog === 'Digital').length,
      input: series.filter((s) => s.pointType === 'INPUT').length,
      output: series.filter((s) => s.pointType === 'OUTPUT').length,
      variable: series.filter((s) => s.pointType === 'VARIABLE').length,
      allEnabled: series.every((s) => s.visible),
      allDisabled: series.every((s) => !s.visible),
      analogEnabled: series.filter((s) => s.digitalAnalog === 'Analog').every((s) => s.visible),
      digitalEnabled: series.filter((s) => s.digitalAnalog === 'Digital').every((s) => s.visible),
      inputEnabled: series.filter((s) => s.pointType === 'INPUT').every((s) => s.visible),
      outputEnabled: series.filter((s) => s.pointType === 'OUTPUT').every((s) => s.visible),
      variableEnabled: series.filter((s) => s.pointType === 'VARIABLE').every((s) => s.visible),
    };
  }, [series]);

  /**
   * Export chart as PNG
   */
  const exportToPNG = useCallback(() => {
    const chart = chartInstanceRef.current;
    if (!chart) {
      console.warn('Chart instance not available for PNG export');
      return;
    }
    const dataUrl = typeof chart.getDataURL === 'function'
      ? chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
      : typeof chart.toBase64Image === 'function'
        ? chart.toBase64Image('image/png', 1)
        : chart.canvas?.toDataURL?.('image/png');

    if (!dataUrl) {
      console.warn('Chart instance does not support PNG export');
      return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `trend-chart-${trendlogId}-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  }, [trendlogId]);

  /**
   * Export data to JSON
   */
  const exportToJSON = useCallback(() => {
    const data = series.map((s) => ({
      name: s.name,
      pointType: s.pointType,
      pointIndex: s.pointIndex,
      unit: s.unit,
      data: s.data.map((d) => ({
        timestamp: new Date(d.timestamp).toISOString(),
        value: d.value,
      })),
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trend_data_${serialNumber}_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [series, serialNumber]);

  /**
   * Export data to CSV
   */
  const exportToCSV = useCallback(() => {
    const csv: string[] = [];
    const headers = ['Timestamp', ...series.map((s) => `${s.name} (${s.unit || ''})`)];
    csv.push(headers.join(','));

    // Get all unique timestamps
    const timestamps = new Set<number>();
    series.forEach((s) => {
      s.data.forEach((point) => timestamps.add(point.timestamp));
    });

    // Sort timestamps
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    // Build rows
    sortedTimestamps.forEach((timestamp) => {
      const row = [new Date(timestamp).toISOString()];
      series.forEach((s) => {
        const point = s.data.find((p) => p.timestamp === timestamp);
        row.push(point ? point.value.toFixed(2) : '');
      });
      csv.push(row.join(','));
    });

    // Download
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trend_data_${serialNumber}_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [series, serialNumber]);

  // Toolbar JSX - memoized for performance
  const toolbar = useMemo(() => (
    <div className={styles.toolbar}>
      {/* Time Base Control Group */}
      <div className={styles.controlGroupWithIndicator}>
        <Text className={styles.controlLabel}>Time Base:</Text>
        <Dropdown
          value={timeBase}
          selectedOptions={[timeBase]}
          onOptionSelect={(_, data) => {
            const val = data.optionValue as TimeBase;
            if (val === 'custom') {
              // pre-fill with current window
              const now = new Date();
              const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
              const rangeMs = getTimeRangeMinutes(timeBase === 'custom' ? '5m' : timeBase) * 60000;
              setCustomStartInput(fmt(new Date(now.getTime() - rangeMs)));
              setCustomEndInput(fmt(now));
              setShowCustomDateModal(true);
            } else {
              setTimeBase(val);
            }
          }}
          size="small"
          className={styles.timeBaseDropdown}
          style={{ fontSize: '11px', minWidth: '100px', fontWeight: 'normal' }}
        >
          <Option value="5m" style={{ fontSize: '11px' }}>5 minutes</Option>
          <Option value="10m" style={{ fontSize: '11px' }}>10 minutes</Option>
          <Option value="30m" style={{ fontSize: '11px' }}>30 minutes</Option>
          <Option value="1h" style={{ fontSize: '11px' }}>1 hour</Option>
          <Option value="4h" style={{ fontSize: '11px' }}>4 hours</Option>
          <Option value="12h" style={{ fontSize: '11px' }}>12 hours</Option>
          <Option value="1d" style={{ fontSize: '11px' }}>1 day</Option>
          <Option value="4d" style={{ fontSize: '11px' }}>4 days</Option>
          <Option value="custom" style={{ fontSize: '11px', borderTop: '1px solid #eee' }}>Custom Define...</Option>
        </Dropdown>
      </div>

      <div className={styles.divider} />

      {/* Navigation Arrows */}
      <div className={styles.controlGroup}>
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular fontSize={16} />}
          onClick={moveTimeLeft}
          disabled={loading}
          size="small"
          style={{ minWidth: '20px', padding: '2px', width: '20px' }}
          title="Scroll Left (鈫?"
        />
        <Button
          appearance="subtle"
          icon={<ArrowRightRegular fontSize={16} />}
          onClick={moveTimeRight}
          disabled={isRealtime || loading}
          size="small"
          style={{ minWidth: '20px', padding: '2px', width: '20px' }}
          title="Scroll Right (鈫?"
        />
      </div>

      {/* Zoom Controls */}
      <div className={styles.controlGroup}>
        <Button
          appearance="subtle"
          icon={<ArrowUpRegular fontSize={16} />}
          onClick={zoomIn}
          disabled={loading || timeBase === 'custom' || timeBaseOrder.indexOf(timeBase) === 0}
          size="small"
          style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 'normal' }}
          title="Zoom In (鈫?"
        >
          Zoom In
        </Button>
        <Button
          appearance="subtle"
          icon={<ArrowDownRegular fontSize={16} />}
          onClick={zoomOut}
          disabled={loading || timeBase === 'custom' || timeBaseOrder.indexOf(timeBase) === timeBaseOrder.length - 1}
          size="small"
          style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 'normal' }}
          title="Zoom Out (鈫?"
        >
          Zoom Out
        </Button>
      </div>

      {/* Reset Button */}
      <div className={styles.controlGroup}>
        <Button
          appearance="subtle"
          icon={<ArrowResetRegular fontSize={16} />}
          onClick={resetTimeBase}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '2px 6px', fontWeight: 'normal' }}
        >
          Reset
        </Button>
      </div>

      <div className={styles.divider} />

      {/* View Buttons */}
      <div className={styles.controlGroup}>
        <Button
          appearance={currentView === 1 ? 'primary' : 'subtle'}
          onClick={() => setCurrentView(1)}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
        >
          View 1
        </Button>
        <Button
          appearance={currentView === 2 ? 'primary' : 'subtle'}
          onClick={() => setCurrentView(2)}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
        >
          View 2
        </Button>
        <Button
          appearance={currentView === 3 ? 'primary' : 'subtle'}
          onClick={() => setCurrentView(3)}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
        >
          View 3
        </Button>
        {currentView !== 1 && hasTrackedItems && (
          <Button
            appearance="subtle"
            icon={<SettingsRegular />}
            onClick={openItemSelector}
            disabled={loading}
            size="small"
            title="Reconfigure tracked items"
            style={{ fontSize: '9px', padding: '4px', minWidth: '24px' }}
          />
        )}
      </div>

      <div className={styles.divider} />

      {/* Status Tags */}
      <div className={styles.statusTags}>
        <div
          className={mergeClasses(styles.statusTag, isRealtime ? styles.statusTagLive : styles.statusTagHistorical, !isRealtime ? styles.clickableCursor : undefined)}
          onClick={!isRealtime ? restoreLiveMode : undefined}
          title={!isRealtime ? 'Click to restore live mode' : ''}
        >
          {isRealtime ? (
            <>
              <span className={styles.liveIndicator}>&#9679;</span>
              {lastSyncTime ? `Live-${lastSyncTime}` : 'Live'}
            </>
          ) : (
            'Historical - click to restore live'
          )}
        </div>
        <div className={`${styles.statusTag} ${styles.statusTagTimeBase}`}>
          {TIMEBASE_LABELS[timeBase] || timeBase}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Config Button */}
      <div className={styles.controlGroup}>
        <Button
          appearance="subtle"
          icon={<DatabaseRegular />}
          onClick={() => setShowConfigModal(true)}
          disabled={loading}
          size="small"
          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
        >
          Config
        </Button>
      </div>

      {/* Export Menu */}
      <div className={styles.controlGroup}>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              icon={<ArrowDownloadRegular />}
              disabled={loading}
              size="small"
              style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 'normal' }}
            >
              Export
            </Button>
          </MenuTrigger>

          <MenuPopover>
            <MenuList>
              <MenuItem icon={<ImageRegular />} onClick={exportToPNG}>
                Export as PNG
              </MenuItem>
              <MenuItem icon={<ArrowDownloadRegular />} onClick={exportToCSV}>
                Export as CSV
              </MenuItem>
              <MenuItem icon={<ArrowDownloadRegular />} onClick={exportToJSON}>
                Export as JSON
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      {/* DB Status Badge */}
      {dbStatus?.visible && (
        <Tooltip
          content={
            <div className={styles.dbTooltipContent}>
              <div className={styles.dbTooltipTitle}>{dbStatus.title}</div>
              <div className={styles.dbTooltipMessage}>{dbStatus.message}</div>
              <div className={styles.dbTooltipHint}>
                Local logging continues. Restore Center DB connectivity to resume sync.
              </div>
            </div>
          }
          relationship="description"
          positioning="below-end"
        >
          <div className={mergeClasses(styles.dbBadge, dbStatus.severity === 'error' ? styles.dbBadgeError : styles.dbBadgeWarn)}>
            <WarningRegular fontSize={13} />
            DB
          </div>
        </Tooltip>
      )}

      {loading && <Spinner size="tiny" />}

      {/* Back button — pinned to far right */}
      {props.onBack && (
        <Button
          appearance="subtle"
          icon={<ArrowLeftRegular fontSize={16} />}
          onClick={props.onBack}
          size="small"
          style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 'normal' }}
        >
          Back
        </Button>
      )}
    </div>
  ), [
    timeBase, currentView, isRealtime, loading, lastSyncTime, dbStatus, hasTrackedItems,
    zoomIn, zoomOut, resetTimeBase, moveTimeLeft, moveTimeRight, restoreLiveMode,
    exportToPNG, exportToCSV, exportToJSON, openItemSelector, getTimeRangeMinutes,
    props.onBack,
  ]);

  // Call onToolbarRender when in drawer mode
  useEffect(() => {
    if (isDrawerMode && onToolbarRender) {
      onToolbarRender(toolbar);
    }
    // Cleanup: clear toolbar when component unmounts or mode changes
    return () => {
      if (isDrawerMode && onToolbarRender) {
        onToolbarRender(null);
      }
    };
  }, [toolbar, isDrawerMode, onToolbarRender]);

  return (
    <div className={styles.container}>

      {/* 鈹€鈹€ TOP CONTROLS TOOLBAR (full-page mode only) 鈹€鈹€ */}
      {!isDrawerMode && (
        <div className={styles.topControlsBar}>
          {toolbar}
        </div>
      )}

      {/* 鈹€鈹€ VIEW 2 / 3 EMPTY STATE 鈹€鈹€ */}
      {currentView !== 1 && !hasTrackedItems && (
        <div className={styles.emptyStateCenter}>
          <div className={styles.iconLarge}>&#128202;</div>
          <Text size={500} weight="semibold">
            {currentView === 2 ? 'Custom View 2' : 'Custom View 3'}
          </Text>
          <Text size={300} className={styles.textMuted}>
            Select items to track to start monitoring specific data points.
          </Text>
          <Button appearance="primary" onClick={openItemSelector}>
            Select Items to Track
          </Button>
        </div>
      )}

      {(currentView === 1 || hasTrackedItems) && (() => {
        // Derive filtered lists for this view
        const viewAnalog = displayedSeries.filter((s) => s.digitalAnalog === 'Analog');
        const viewDigital = displayedSeries.filter((s) => s.digitalAnalog === 'Digital');
        const visAnalog = viewAnalog.filter((s) => s.visible !== false);
        const visDigital = viewDigital.filter((s) => s.visible !== false);

        // Series panel toolbar (shared helper)
        const renderSeriesToolbar = () => (
          <div className={styles.seriesPanelHeader}>
            {/* Header Line: All + By Type + By Unit + Collapse button */}
            <div className={styles.headerControls}>
              <div className={styles.leftControls}>
                {/* All Dropdown */}
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button size="small" appearance="subtle" icon={<ChevronDownRegular />} iconPosition="after" className={styles.filterBarBtn}>All</Button>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem className={styles.filterMenuItem} onClick={handleEnableAll} disabled={seriesCounts.allEnabled}>Enable All</MenuItem>
                      <MenuItem className={styles.filterMenuItem} onClick={handleDisableAll} disabled={seriesCounts.allDisabled}>Disable All</MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>

                {/* By Type Dropdown */}
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button size="small" appearance="subtle" icon={<ChevronDownRegular />} iconPosition="after" className={styles.filterBarBtn}>By Type</Button>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem className={styles.filterMenuItem} onClick={() => toggleByAnalogDigital('Analog')} disabled={seriesCounts.analog === 0}>
                        {seriesCounts.analogEnabled ? 'Disable' : 'Enable'} Analog ({seriesCounts.analog})
                      </MenuItem>
                      <MenuItem className={styles.filterMenuItem} onClick={() => toggleByAnalogDigital('Digital')} disabled={seriesCounts.digital === 0}>
                        {seriesCounts.digitalEnabled ? 'Disable' : 'Enable'} Digital ({seriesCounts.digital})
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem className={styles.filterMenuItem} onClick={() => toggleByPointType('INPUT')} disabled={seriesCounts.input === 0}>
                        {seriesCounts.inputEnabled ? 'Disable' : 'Enable'} Input ({seriesCounts.input})
                      </MenuItem>
                      <MenuItem className={styles.filterMenuItem} onClick={() => toggleByPointType('OUTPUT')} disabled={seriesCounts.output === 0}>
                        {seriesCounts.outputEnabled ? 'Disable' : 'Enable'} Output ({seriesCounts.output})
                      </MenuItem>
                      <MenuItem className={styles.filterMenuItem} onClick={() => toggleByPointType('VARIABLE')} disabled={seriesCounts.variable === 0}>
                        {seriesCounts.variableEnabled ? 'Disable' : 'Enable'} Variable ({seriesCounts.variable})
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>

                {/* By Unit Dropdown */}
                {distinctUnits.size > 0 && (
                  <Menu>
                    <MenuTrigger disableButtonEnhancement>
                      <Button size="small" appearance="subtle" icon={<ChevronDownRegular />} iconPosition="after">By Unit</Button>
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        {Array.from(distinctUnits.entries()).map(([unit, info]) => (
                          <MenuItem key={unit} className={styles.filterMenuItem} onClick={() => toggleByUnit(unit)}>
                            {info.allEnabled ? 'Disable' : 'Enable'} {unit} ({info.count})
                          </MenuItem>
                        ))}
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                )}
                {/* Collapse button — right-aligned after By Unit */}
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<ChevronLeftRegular fontSize={12} />}
                  className={styles.collapseBtn}
                  onClick={() => setLeftPanelCollapsed(true)}
                  title="Hide panel"
                  style={{ marginLeft: 'auto' }}
                />
              </div>

            </div>
          </div>
        );

        // Render a series item
        const renderSeriesItem = (s: TrendSeries, globalIndex: number) => {
          const seriesKey = `${s.pointId}-${s.pointIndex}`;
          const isExpanded = expandedSeries.has(seriesKey);
          const isKeySelected = keyboardEnabled && selectedItemIndex === globalIndex;

          return (
            <React.Fragment key={seriesKey}>
              <div
                className={mergeClasses(styles.seriesItem, isExpanded ? styles.seriesItemExpanded : undefined, isKeySelected ? styles.selectedSeriesItem : undefined)}
                onClick={() => toggleSeriesVisibility(globalIndex)}
              >
                {/* Sequential number badge — only visible when keyboard shortcuts enabled */}
                {keyboardEnabled && <div className={styles.seriesNumber}>{globalIndex + 1}</div>}

                {/* Delete overlay for View 2 & 3 */}
                {currentView !== 1 && (
                  <Button
                    appearance="subtle"
                    icon={<DismissRegular fontSize={12} />}
                    onClick={(e) => { e.stopPropagation(); removeFromTracking(seriesKey); }}
                    size="small"
                    className={styles.removeTrackingButton}
                    title="Remove from tracking"
                  />
                )}

                {/* Toggle switch — color indicator */}
                <div className={styles.colorIndicatorWrap} onClick={(e) => e.stopPropagation()}>
                  <div
                    className={mergeClasses(styles.colorIndicator, getColorClass(s.color, s.visible === false))}
                    onClick={() => toggleSeriesVisibility(globalIndex)}
                  >
                    <div className={mergeClasses(styles.toggleInner, s.visible !== false ? styles.toggleInnerActive : undefined)} />
                  </div>
                </div>

                {/* series-info: flex column wrapping series-name-line */}
                <div className={styles.seriesItemContent}>
                  {/* series-name-line: space-between row */}
                  <div className={styles.seriesItemInfo}>
                    {/* series-name-col */}
                    <Tooltip content={s.name} relationship="label">
                      <span className={mergeClasses(styles.seriesItemName, s.visible === false ? styles.seriesNameHidden : undefined)}>
                        {s.name}
                      </span>
                    </Tooltip>

                    {/* series-right-group: grid 40px 40px auto */}
                    <div className={styles.seriesItemMeta}>
                      {/* chip col — 40px */}
                      <div className={styles.seriesChipCol}>
                        {(s.prefix || s.pointType) && (
                          <span className={styles.typeChip}>{getPrefixTag(s.pointType, s.prefix)}</span>
                        )}
                      </div>
                      {/* unit col — 40px */}
                      <div className={styles.seriesTagsCol}>
                        <span className={mergeClasses(styles.seriesItemUnit, getUnitColorClass(s.color))}>{s.unit || 'N/A'}</span>
                      </div>
                      {/* expand col — auto */}
                      <div className={styles.seriesControlsCol}>
                        <Button
                          appearance="subtle"
                          icon={isExpanded ? <ChevronDownFilled fontSize={11} /> : <ChevronRightRegular fontSize={11} />}
                          onClick={(e) => { e.stopPropagation(); toggleSeriesExpand(seriesKey); }}
                          className={styles.expandButton}
                          size="small"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.seriesDetails}>
                  <div className={styles.seriesStats}>
                    {s.digitalAnalog === 'Analog' ? (
                      <>
                        <Text size={100}><strong>Last:</strong> {s.data && s.data.length > 0 ? `${s.data[s.data.length - 1].value.toFixed(2)} ${s.unit || ''}` : 'N/A'}</Text>
                        <Text size={100}><strong>Avg:</strong> {s.data && s.data.length > 0 ? `${(s.data.reduce((sum, p) => sum + p.value, 0) / s.data.length).toFixed(2)} ${s.unit || ''}` : 'N/A'}</Text>
                        <Text size={100}><strong>Min:</strong> {s.data && s.data.length > 0 ? `${Math.min(...s.data.map(p => p.value)).toFixed(2)} ${s.unit || ''}` : 'N/A'}</Text>
                        <Text size={100}><strong>Max:</strong> {s.data && s.data.length > 0 ? `${Math.max(...s.data.map(p => p.value)).toFixed(2)} ${s.unit || ''}` : 'N/A'}</Text>
                      </>
                    ) : (
                      <>
                        <Text size={100}><strong>Last:</strong> {s.data && s.data.length > 0 ? (s.data[s.data.length - 1].value === 1 ? 'ON' : 'OFF') : 'N/A'}</Text>
                        <Text size={100}><strong>Points:</strong> {s.data?.length || 0}</Text>
                        <Text size={100}><strong>ON count:</strong> {s.data?.filter(p => p.value === 1).length || 0}</Text>
                        <Text size={100}><strong>OFF count:</strong> {s.data?.filter(p => p.value === 0).length || 0}</Text>
                      </>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        };

        return (
          <>
            {/* ANALOG AREA */}
            {(visAnalog.length > 0 || (viewAnalog.length === 0 && viewDigital.length === 0)) && viewAnalog.length > 0 && (
              <div className={styles.analogArea}>
                {/* Expand tab — only visible when panel is collapsed */}
                {leftPanelCollapsed && (
                  <div className={styles.expandTab} onClick={() => setLeftPanelCollapsed(false)} title="Show panel">
                    <ChevronRightRegular fontSize={10} />
                  </div>
                )}
                <div className={mergeClasses(styles.leftPanel, leftPanelCollapsed ? styles.leftPanelCollapsed : undefined)}>
                  {renderSeriesToolbar()}
                  {/* Series list: loading/timeout/error empty states */}
                  <div className={styles.seriesPanel}>
                    {viewAnalog.length === 0 && series.length === 0 && (
                      <div className={mergeClasses(styles.emptyState, styles.emptyStateCompact)}>
                        {loading && !loadingTimedOut ? (
                          <>
                            <Spinner size="small" />
                            <Text size={200} block className={styles.mt8}>Loading T3000 device data...</Text>
                            <Text size={100} block className={mergeClasses(styles.textMuted, styles.mt4)}>
                              Connecting to your T3000 devices to retrieve trend data.
                            </Text>
                          </>
                        ) : loadingTimedOut ? (
                          <>
                            <div className={styles.iconSmall}>&#9200;</div>
                            <Text size={200} block className={styles.mt8}>Loading Timeout</Text>
                            <Text size={100} block className={mergeClasses(styles.textMuted, styles.mt4)}>
                              Loading took too long (&gt;30s). The system may be busy.
                            </Text>
                            <Button appearance="primary" size="small" icon={<ArrowClockwiseRegular />}
                              onClick={manualRefresh} disabled={loading} className={styles.mt12}>
                              Refresh Data
                            </Button>
                          </>
                        ) : dataSource === 'error' ? (
                          <>
                            <ErrorCircleRegular fontSize={24} />
                            <Text size={200} block className={styles.mt8}>Data Connection Error</Text>
                            <Text size={100} block className={mergeClasses(styles.textMuted, styles.mt4)}>
                              Unable to load real-time or historical data.
                            </Text>
                            <Button appearance="primary" size="small" icon={<ArrowClockwiseRegular />}
                              onClick={manualRefresh} disabled={loading} className={styles.mt12}>
                              Refresh Data
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className={styles.iconSmall}>&#9200;</div>
                            <Text size={200} block className={styles.mt8}>No Data Available</Text>
                            <Text size={100} block className={mergeClasses(styles.textMuted, styles.mt4)}>
                              Configure monitor points to see data series.
                            </Text>
                          </>
                        )}
                      </div>
                    )}
                    {viewAnalog.map((s, i) => renderSeriesItem(s, i))}
                    {viewAnalog.length > 0 && viewDigital.length > 0 && (
                      <div className={styles.digitalSectionDivider}>Digital</div>
                    )}
                    {viewDigital.map((s, i) => renderSeriesItem(s, viewAnalog.length + i))}
                  </div>
                </div>
                <div className={styles.rightPanel}>
                  <TrendChart series={[...visAnalog, ...visDigital]} timeBase={timeBase === 'custom' ? '1h' : timeBase} showGrid={showGrid}
                    chartType="analog" timeOffset={timeOffset}
                    onChartReady={(instance: any) => { chartInstanceRef.current = instance; }} />
                </div>
              </div>
            )}

            {/* RESIZABLE DIVIDER */}
            {false && visAnalog.length > 0 && visDigital.length > 0 && (
              <div className={styles.resizableDivider}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const container = (e.currentTarget as HTMLElement).parentElement!;
                  const analogEl = container.querySelector('[data-area="analog"]') as HTMLElement;
                  const startH = analogEl ? analogEl.offsetHeight : 0;
                  const onMove = (me: MouseEvent) => {
                    const delta = me.clientY - startY;
                    if (analogEl) analogEl.style.height = `${Math.max(100, startH + delta)}px`;
                  };
                  const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              >
                <div className={styles.dividerGrip} />
              </div>
            )}

            {/* DIGITAL AREA */}
            {viewDigital.length > 0 && viewAnalog.length === 0 && (
              <div className={styles.digitalArea}>
                {/* Expand tab — only visible when panel is collapsed */}
                {leftPanelCollapsed && (
                  <div className={styles.expandTab} onClick={() => setLeftPanelCollapsed(false)} title="Show panel">
                    <ChevronRightRegular fontSize={10} />
                  </div>
                )}
                <div className={mergeClasses(styles.digitalLeftPanel, leftPanelCollapsed ? styles.leftPanelCollapsed : undefined)}>
                  {viewAnalog.length === 0 && renderSeriesToolbar()}
                  {viewAnalog.length > 0 && (
                    <div className={styles.seriesPanelHeader}>
                      <Text size={200} weight="semibold">
                        Digital ({visDigital.length}/{viewDigital.length})
                      </Text>
                    </div>
                  )}
                  <div className={styles.seriesPanel}>
                    {viewDigital.map((s, i) => renderSeriesItem(s, viewAnalog.length + i))}
                  </div>
                </div>
                <div className={styles.digitalRightPanel}>
                  {visDigital.map((ds) => (
                    <div key={ds.name} className={styles.channelChart}>
                      <TrendChart series={[ds]} timeBase={timeBase === 'custom' ? '1h' : timeBase} showGrid={showGrid}
                        chartType="digital" timeOffset={timeOffset} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generic empty state when no series at all */}
            {viewAnalog.length === 0 && viewDigital.length === 0 && (
              <div className={styles.emptyStateCenter}>
                {loading && !loadingTimedOut ? (
                  <>
                    <Spinner size="medium" />
                    <Text size={400} weight="semibold" className={styles.mt16}>Loading T3000 device data...</Text>
                    <Text size={300} className={styles.textMuted}>
                      Connecting to your T3000 devices to retrieve trend data鈥?                    </Text>
                  </>
                ) : loadingTimedOut ? (
                  <>
                    <div className={styles.iconMedium}>&#9200;</div>
                    <Text size={400} weight="semibold" className={styles.mt12}>Loading Timeout</Text>
                    <Text size={300} className={styles.textMuted}>
                      Loading took too long (&gt;30s). The system may be busy or experiencing connection issues.
                    </Text>
                    <Button appearance="primary" icon={<ArrowClockwiseRegular />} onClick={manualRefresh} disabled={loading} className={styles.mt16}>
                      Refresh Data
                    </Button>
                  </>
                ) : dataSource === 'error' ? (
                  <>
                    <ErrorCircleRegular fontSize={32} />
                    <Text size={400} weight="semibold" className={styles.mt12}>Data Connection Error</Text>
                    <Text size={300} className={styles.textMuted}>
                      Unable to load real-time or historical data. Check system connections.
                    </Text>
                    <Button appearance="primary" icon={<ArrowClockwiseRegular />} onClick={manualRefresh} disabled={loading} className={styles.mt16}>
                      Refresh Data
                    </Button>
                  </>
                ) : (
                  <>
                    <Text size={500} weight="semibold">No Data Available</Text>
                    <Text size={300} className={styles.textMuted}>
                      Please select a device and monitor configuration.
                    </Text>
                  </>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* 鈹€鈹€ CUSTOM DATE RANGE MODAL 鈹€鈹€ */}
      <Dialog open={showCustomDateModal} onOpenChange={(_, d) => setShowCustomDateModal(d.open)}>
        <DialogSurface className={styles.dialogSurfaceSmall}>
          <DialogTitle>Custom Time Range</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div className={styles.stackCol12}>
                <div>
                  <Text size={200} weight="semibold" block className={styles.fieldLabel}>Start</Text>
                  <Input type="datetime-local" value={customStartInput}
                    onChange={(_, d) => setCustomStartInput(d.value)} className={styles.inputFull} />
                </div>
                <div>
                  <Text size={200} weight="semibold" block className={styles.fieldLabel}>End</Text>
                  <Input type="datetime-local" value={customEndInput}
                    onChange={(_, d) => setCustomEndInput(d.value)} className={styles.inputFull} />
                </div>
                <div className={styles.rowWrap6}>
                  <Button size="small" onClick={() => setQuickRange('today')}>Today</Button>
                  <Button size="small" onClick={() => setQuickRange('yesterday')}>Yesterday</Button>
                  <Button size="small" onClick={() => setQuickRange('thisWeek')}>This Week</Button>
                  <Button size="small" onClick={() => setQuickRange('lastWeek')}>Last Week</Button>
                </div>
                {customStartInput && customEndInput && (
                  <Text size={100} className={styles.textMuted}>
                    {new Date(customStartInput).toLocaleString()} 鈫?{new Date(customEndInput).toLocaleString()}
                  </Text>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowCustomDateModal(false)}>Cancel</Button>
              <Button appearance="primary" onClick={applyCustomDateRange}
                disabled={!customStartInput || !customEndInput}>Apply</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* ─── CONFIG DRAWER ─── */}
      <OverlayDrawer
        open={showConfigModal}
        onOpenChange={(_, d) => setShowConfigModal(d.open)}
        position="end"
        size="medium"
      >
        <DrawerHeader style={{ padding: '8px 16px', minHeight: 'unset' }}>
          <DrawerHeaderTitle
            heading={{ as: 'h3', style: { fontSize: '13px', fontWeight: 600, margin: 0 } }}
            action={
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                onClick={() => setShowConfigModal(false)}
              />
            }
          >
            Trendlog Configuration
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody style={{ overflowY: 'auto', overflowX: 'hidden', padding: '10px 14px' }}>
          <div className={styles.stackCol10}>

            {/* Sampling Interval */}
            <div className={styles.sectionCard}>
              <div className={styles.rowBetween}>
                <Text weight="semibold" size={200} className={styles.rowWrap6}>
                  <ClockRegular style={{ color: '#52c41a' }} /> Sampling Interval
                </Text>
                <Text size={100} className={styles.textMuted}>How often should data be collected?</Text>
              </div>
              <RadioGroup
                layout="horizontal"
                className={mergeClasses(styles.radioGroupWrap, styles.drawerRadioGroup)}
                value={ffiIntervalPreset}
                onChange={(_, d) => {
                  const preset = d.value as typeof ffiIntervalPreset;
                  setFfiIntervalPreset(preset);
                  const nextSecs = preset === 'custom' ? Math.max(1, ffiCustomMinutes) * 60
                    : ({ '15min': 900, '20min': 1200, '30min': 1800, '60min': 3600 } as Record<string, number>)[preset];
                  if (nextSecs !== undefined) setFfiSyncIntervalSecs(nextSecs);
                  checkFfiSyncWarning(nextSecs ?? ffiSyncIntervalSecs);
                }}
              >
                <Radio value="15min" label="15 min" />
                <Radio value="20min" label="20 min" />
                <Radio value="30min" label="30 min" />
                <Radio value="60min" label="60 min" />
                <Radio value="custom" label="Custom" />
              </RadioGroup>
              {ffiIntervalPreset === 'custom' && (
                <div className={mergeClasses(styles.rowWrap6, styles.mt8)}>
                  <Text size={100}>Every:</Text>
                  <Input
                    type="number" min={1} max={59}
                    value={String(ffiCustomMinutes)}
                    onChange={(_, d) => {
                      const val = Math.max(1, Math.min(59, Number(d.value) || 1));
                      setFfiCustomMinutes(val);
                      const secs = val * 60;
                      setFfiSyncIntervalSecs(secs);
                      checkFfiSyncWarning(secs);
                    }}
                    className={styles.inputSmall}
                  />
                  <Text size={100}>minutes</Text>
                </div>
              )}
              {!!ffiSyncWarning && <Text size={100} className={styles.warningText}>{ffiSyncWarning}</Text>}
            </div>

            {/* Refresh and Rediscover Interval */}
            <div className={styles.sectionCard}>
              <div className={styles.rowBetween}>
                <Text weight="semibold" size={200} className={styles.rowWrap6}>
                  <ArrowClockwiseRegular style={{ color: '#fa8c16' }} /> Refresh and Rediscover Interval
                </Text>
                <Text size={100} className={styles.textMuted}>How often should system check for new BACnet objects?</Text>
              </div>
              <RadioGroup
                layout="horizontal"
                className={mergeClasses(styles.radioGroupWrap, styles.drawerRadioGroup)}
                value={rediscoverIntervalPreset}
                onChange={(_, d) => {
                  const preset = d.value as typeof rediscoverIntervalPreset;
                  setRediscoverIntervalPreset(preset);
                  const nextSecs = preset === 'custom' ? Math.max(1, rediscoverCustomHours) * 3600
                    : ({ '1hour': 3600, '2hours': 7200, '4hours': 14400, '8hours': 28800 } as Record<string, number>)[preset];
                  if (nextSecs !== undefined) setRediscoverIntervalSecs(nextSecs);
                  checkRediscoverWarning(nextSecs ?? rediscoverIntervalSecs);
                }}
              >
                <Radio value="1hour" label="1 hour" />
                <Radio value="2hours" label="2 hours" />
                <Radio value="4hours" label="4 hours" />
                <Radio value="8hours" label="8 hours" />
                <Radio value="custom" label="Custom" />
              </RadioGroup>
              {rediscoverIntervalPreset === 'custom' && (
                <div className={mergeClasses(styles.rowWrap6, styles.mt8)}>
                  <Text size={100}>Every:</Text>
                  <Input
                    type="number" min={1} max={168}
                    value={String(rediscoverCustomHours)}
                    onChange={(_, d) => {
                      const val = Math.max(1, Math.min(168, Number(d.value) || 1));
                      setRediscoverCustomHours(val);
                      const secs = val * 3600;
                      setRediscoverIntervalSecs(secs);
                      checkRediscoverWarning(secs);
                    }}
                    className={styles.inputSmall}
                  />
                  <Text size={100}>hours</Text>
                </div>
              )}
              {!!rediscoverWarning && <Text size={100} className={styles.warningText}>{rediscoverWarning}</Text>}
            </div>

            {/* Database Status */}
            <div className={styles.sectionCard}>
              <div className={styles.rowBetween}>
                <Text weight="semibold" size={200} className={styles.rowWrap6}>
                  <DatabaseRegular style={{ color: '#1890ff' }} /> Database Status
                </Text>
                <Text size={100} className={styles.textMuted}>
                  {dbFiles.find((f) => f.is_active)?.name ?? ''}
                </Text>
              </div>
              {(dbConfigLoading || dbFilesLoading || syncConfigLoading) && (
                <div className={styles.loadingRow}>
                  <Spinner size="tiny" />
                  <Text size={100}>Loading...</Text>
                </div>
              )}
            </div>

            {/* Data Splitting Strategy */}
            <div className={styles.sectionCard}>
              <div className={styles.rowBetween}>
                <Text weight="semibold" size={200} className={styles.rowWrap6}>
                  <SettingsRegular style={{ color: '#fa8c16' }} /> Data Splitting Strategy
                </Text>
                <Button
                  size="small"
                  icon={<ArrowClockwiseRegular />}
                  onClick={() => { loadDatabaseConfig(); loadDatabaseFiles(); }}
                  disabled={dbConfigLoading || dbFilesLoading}
                >
                  Refresh
                </Button>
              </div>
              <Text size={100} className={styles.fieldLabel}>Split new data by:</Text>
              <RadioGroup
                layout="horizontal"
                className={mergeClasses(styles.radioGroupWrap, styles.drawerRadioGroup)}
                value={dbConfig.strategy}
                onChange={(_, d) => setDbConfig((prev) => ({ ...prev, strategy: d.value as DatabasePartitionConfig['strategy'] }))}
              >
                <Radio value="Daily" label="Daily" />
                <Radio value="Weekly" label="Weekly" />
                <Radio value="Monthly" label="Monthly" />
                <Radio value="Quarterly" label="Quarterly" />
                <Radio value="Custom" label="Custom Days" />
                <Radio value="CustomMonths" label="Custom Months" />
              </RadioGroup>
              {dbConfig.strategy === 'Custom' && (
                <div className={mergeClasses(styles.rowWrap6, styles.mt8)}>
                  <Text size={100}>Every:</Text>
                  <Input
                    type="number" min={1} max={365}
                    value={String(dbConfig.custom_days ?? 30)}
                    onChange={(_, d) => {
                      const parsed = Number(d.value);
                      setDbConfig((prev) => ({ ...prev, custom_days: Number.isFinite(parsed) ? parsed : 1 }));
                    }}
                    className={styles.inputSmall}
                  />
                  <Text size={100}>days</Text>
                </div>
              )}
              {dbConfig.strategy === 'CustomMonths' && (
                <div className={mergeClasses(styles.rowWrap6, styles.mt8)}>
                  <Text size={100}>Every:</Text>
                  <Input
                    type="number" min={1} max={12}
                    value={String(dbConfig.custom_months ?? 2)}
                    onChange={(_, d) => {
                      const parsed = Number(d.value);
                      setDbConfig((prev) => ({ ...prev, custom_months: Number.isFinite(parsed) ? parsed : 1 }));
                    }}
                    className={styles.inputSmall}
                  />
                  <Text size={100}>months</Text>
                </div>
              )}
              <Text size={100} className={mergeClasses(styles.textMuted, styles.mt8)}>
                Current: {(
                  dbConfig.strategy === 'Daily' ? 'One file per day' :
                  dbConfig.strategy === 'Weekly' ? 'One file per week' :
                  dbConfig.strategy === 'Monthly' ? 'One file per month' :
                  dbConfig.strategy === 'Quarterly' ? 'One file per quarter (3 months)' :
                  dbConfig.strategy === 'CustomMonths' ? `One file every ${dbConfig.custom_months} months` :
                  dbConfig.strategy === 'Custom' ? `One file every ${dbConfig.custom_days} days` :
                  'One file every 5 minutes'
                )}
              </Text>
              {!!dbConfigMessage && (
                <Text size={100} className={styles.successText}>{dbConfigMessage}</Text>
              )}
            </div>

            {/* Database Files */}
            <div className={styles.sectionCard}>
              <div className={styles.rowBetween}>
                <Text weight="semibold" size={200} className={styles.rowWrap6}>
                  <DatabaseRegular style={{ color: '#1890ff' }} /> Database Files ({dbFiles.length})
                </Text>
                <Button
                  size="small"
                  appearance="primary"
                  icon={<DeleteRegular />}
                  onClick={cleanupAllDatabaseFiles}
                  disabled={!!dbActionBusy || dbConfigLoading}
                >
                  Clean All
                </Button>
              </div>
              <div className={styles.filesList}>
                {dbFiles.length === 0 && !dbFilesLoading && (
                  <Text size={100} className={styles.textMuted}>No partition files found.</Text>
                )}
                {dbFiles.map((file) => (
                  <div key={file.id} className={styles.fileRow}>
                    <div className={styles.minWidthZero}>
                      <div className={styles.rowWrap6}>
                        <Text size={100} weight="semibold" className={styles.ellipsisText}>{file.name}</Text>
                        {file.is_active && (
                          <Tag size="small" appearance="filled" style={{ background: '#52c41a', color: '#fff', fontSize: '9px', padding: '1px 4px' }}>ACTIVE</Tag>
                        )}
                      </div>
                    </div>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<DeleteRegular />}
                      disabled={file.is_active || !!dbActionBusy}
                      onClick={() => deleteDatabaseFile(file.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Cleanup Management */}
            <div className={styles.sectionCard}>
              <Text weight="semibold" size={200} className={styles.rowWrap6} style={{ marginBottom: '6px' }}>
                <DeleteRegular style={{ color: '#ff4d4f' }} /> Cleanup Management
              </Text>
              <div className={styles.rowWrap6}>
                <Text size={100} className={styles.textMuted} style={{ whiteSpace: 'nowrap' }}>Auto cleanup files older than:</Text>
                <Input
                  type="number" min={1} max={365}
                  value={String(dbConfig.retention_value ?? 30)}
                  onChange={(_, d) => {
                    const parsed = Number(d.value);
                    setDbConfig((prev) => ({ ...prev, retention_value: Number.isFinite(parsed) ? parsed : 1 }));
                  }}
                  className={styles.inputSmall}
                />
                <Dropdown
                  className={styles.cleanupUnit}
                  value={dbConfig.retention_unit}
                  selectedOptions={[dbConfig.retention_unit]}
                  onOptionSelect={(_, d) => {
                    if (d.optionValue) setDbConfig((prev) => ({ ...prev, retention_unit: d.optionValue as DatabasePartitionConfig['retention_unit'] }));
                  }}
                >
                  <Option value="Days">Days</Option>
                  <Option value="Weeks">Weeks</Option>
                  <Option value="Months">Months</Option>
                </Dropdown>
              </div>
              <div className={mergeClasses(styles.rowWrap6, styles.mt8)}>
                <Button
                  size="small"
                  appearance="primary"
                  icon={<DeleteRegular />}
                  onClick={cleanupOldDatabaseFiles}
                  disabled={!!dbActionBusy || dbConfigLoading}
                >
                  Clean up now
                </Button>
                <Button
                  size="small"
                  icon={<SettingsRegular />}
                  onClick={optimizeDatabase}
                  disabled={!!dbActionBusy || dbConfigLoading}
                >
                  Optimize
                </Button>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className={styles.sectionCard}>
              <div className={styles.rowBetween}>
                <Text weight="semibold" size={200}>Keyboard Shortcuts</Text>
                <Switch
                  checked={keyboardEnabled}
                  onChange={(_, d) => setKeyboardEnabled(d.checked)}
                  className={styles.smallSwitch}
                />
              </div>
              <div className={styles.shortcutsGrid}>
                {[
                  ['← / →', 'Scroll time left/right'],
                  ['↑ / ↓', 'Zoom in/out'],
                  ['1-9, A-E', 'Toggle series visibility'],
                  ['Ctrl + ↑ / ↓', 'Navigate series list'],
                  ['Enter', 'Toggle selected item'],
                  ['ESC', 'Toggle item shortcuts on/off'],
                ].map(([key, desc]) => (
                  <div key={key} className={styles.shortcutCell}>
                    <kbd className={styles.keycap}>{key}</kbd>
                    <Text size={100} className={styles.textMuted}>: {desc}</Text>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </DrawerBody>
        <DrawerFooter style={{ padding: '8px 16px', borderTop: `1px solid ${tokens.colorNeutralStroke1}` }}>
          <Button size="small" onClick={() => setShowConfigModal(false)}>Cancel</Button>
          <Button
            size="small"
            appearance="primary"
            disabled={dbConfigSaving || syncConfigSaving}
            onClick={async () => {
              await saveSyncConfig();
              await saveDatabaseConfig();
              setShowConfigModal(false);
            }}
          >
            {(dbConfigSaving || syncConfigSaving) ? 'Saving...' : 'Save Changes'}
          </Button>
        </DrawerFooter>
      </OverlayDrawer>

      {/* 鈹€鈹€ ITEM SELECTOR DIALOG (View 2 & 3) 鈹€鈹€ */}
      <Dialog open={showItemSelector} onOpenChange={(_, d) => setShowItemSelector(d.open)}>
        <DialogSurface className={styles.dialogSurfaceSelector}>
          <DialogTitle>
            Select Items for View {currentView}
            <Text size={200} className={styles.textMuted}>
              ({selectorDraftKeys.length}/{series.length} selected)
            </Text>
          </DialogTitle>
          <DialogBody>
            <DialogContent className={styles.selectorContent}>
              <div className={styles.selectorHeader}>
                <Button size="small" onClick={() => setSelectorDraftKeys(series.map(s => `${s.pointId}-${s.pointIndex}`))}>
                  <CheckmarkRegular /> Select All
                </Button>
                <Button size="small" onClick={() => setSelectorDraftKeys([])}>
                  <DismissRegular /> Unselect All
                </Button>
              </div>
              {series.map((s) => {
                const key = `${s.pointId}-${s.pointIndex}`;
                const checked = selectorDraftKeys.includes(key);
                return (
                  <div key={key} className={styles.selectorRow}>
                    <Checkbox checked={checked}
                      onChange={(_, d) => setSelectorDraftKeys(prev =>
                        d.checked ? [...prev, key] : prev.filter(k => k !== key)
                      )} />
                    <div className={mergeClasses(styles.selectorColor, getColorClass(s.color, false))} />
                    <div className={mergeClasses(styles.minWidthZero, styles.seriesItemInfo)}>
                      <Text size={200} weight="semibold" block className={styles.ellipsisText}>
                        {s.name}
                      </Text>
                      <Text size={100} className={styles.textMuted}>
                        {s.pointType} 路 {s.digitalAnalog} 路 {s.unit || 'N/A'}
                        {s.data.length > 0 ? ` 路 ${s.data.length} pts` : ' 路 No Data'}
                      </Text>
                    </div>
                    <Tag size="extra-small" appearance="outline">{s.digitalAnalog === 'Digital' ? 'Digital' : 'Analog'}</Tag>
                  </div>
                );
              })}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowItemSelector(false)}>Cancel</Button>
              <Button appearance="primary" onClick={applyItemSelection}>Apply Selection</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

    </div>
  );
};
