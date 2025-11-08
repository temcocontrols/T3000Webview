/**
 * Icon Mapper Utility
 * Maps icon string names to FluentUI React components
 */

import React from 'react';
import {
  // Common icons
  InfoRegular,
  ArrowCircleDownRegular,
  ArrowCircleUpRegular,
  CodeRegular,
  SettingsRegular,
  ImageRegular,
  CalendarRegular,
  CalendarStarRegular,
  ChartMultipleRegular,
  AlertRegular,
  TableRegular,
  NetworkCheckRegular,
  SearchRegular,
  BuildingMultipleRegular,
  ArrowClockwiseRegular,
  SaveRegular,
  FolderOpenRegular,
  ArrowUploadRegular,
  ArrowDownloadRegular,
  PrintRegular,
  ClockRegular,
  ArchiveRegular,
  ArrowCounterclockwiseRegular,
  QuestionCircleRegular,
  PersonRegular,
  SignOutRegular,
  DocumentRegular,
  FolderRegular,
  type FluentIcon,
} from '@fluentui/react-icons';

/**
 * Icon registry mapping string names to FluentUI components
 */
const iconRegistry: Record<string, FluentIcon> = {
  // Toolbar icons
  Info: InfoRegular,
  ArrowCircleDown: ArrowCircleDownRegular,
  ArrowCircleUp: ArrowCircleUpRegular,
  Variable: CodeRegular, // No Variable icon, use Code
  Code: CodeRegular,
  Settings: SettingsRegular,
  Image: ImageRegular,
  Calendar: CalendarRegular,
  CalendarStar: CalendarStarRegular,
  LineChart: ChartMultipleRegular,
  Alert: AlertRegular,
  Table: TableRegular,
  Network: NetworkCheckRegular,
  SettingsGear: SettingsRegular,
  Search: SearchRegular,
  BuildingMultiple: BuildingMultipleRegular,
  ArrowClockwise: ArrowClockwiseRegular,

  // Menu icons
  Save: SaveRegular,
  SaveAs: SaveRegular,
  FolderOpen: FolderOpenRegular,
  ArrowUpload: ArrowUploadRegular,
  ArrowDownload: ArrowDownloadRegular,
  Print: PrintRegular,
  Clock: ClockRegular,
  Archive: ArchiveRegular,
  ArrowCounterclockwise: ArrowCounterclockwiseRegular,

  // User menu icons
  Person: PersonRegular,
  SignOut: SignOutRegular,
  Document: DocumentRegular,
  Folder: FolderRegular,
  QuestionCircle: QuestionCircleRegular,
};

/**
 * Get FluentUI icon component by string name
 * @param iconName String name of the icon
 * @returns FluentIcon component or undefined if not found
 */
export function getIconComponent(iconName?: string): FluentIcon | undefined {
  if (!iconName) return undefined;
  return iconRegistry[iconName];
}

/**
 * Render icon by string name
 * @param iconName String name of the icon
 * @param props Additional props to pass to icon
 * @returns Rendered icon or null
 */
export function renderIcon(iconName?: string, props?: React.ComponentProps<FluentIcon>): React.ReactElement | null {
  const IconComponent = getIconComponent(iconName);
  if (!IconComponent) return null;
  return <IconComponent {...props} />;
}

/**
 * Check if icon name exists in registry
 * @param iconName String name to check
 * @returns True if icon exists
 */
export function hasIcon(iconName?: string): boolean {
  if (!iconName) return false;
  return iconName in iconRegistry;
}
