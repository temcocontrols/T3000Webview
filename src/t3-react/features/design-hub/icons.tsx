/**
 * Design Hub Icon Resolver
 * Maps registry icon keys to Fluent UI icon components.
 * Only uses icons already imported elsewhere in the app to avoid build risk.
 */

import React from 'react';
import {
  FlowRegular,
  BuildingMultipleRegular,
  DocumentTextRegular,
  DeveloperBoardRegular,
  CircleMultipleConcentricRegular,
  AddRegular,
  FolderOpenRegular,
  HistoryRegular,
  ToolboxRegular,
  PeopleRegular,
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  ArrowClockwiseRegular,
  ArrowUploadRegular,
  SearchRegular,
  ClockRegular,
  DataHistogramRegular,
  AlertRegular,
  EditRegular,
  GridRegular,
  RulerRegular,
  LockClosedRegular,
  OpenRegular,
  SaveRegular,
  ArrowLeftRegular,
  DocumentAddRegular,
  ShareRegular,
} from '@fluentui/react-icons';

export const DESIGN_HUB_ICONS: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  Flow: FlowRegular,
  BuildingMultiple: BuildingMultipleRegular,
  DocumentText: DocumentTextRegular,
  DeveloperBoard: DeveloperBoardRegular,
  CircleMultipleConcentric: CircleMultipleConcentricRegular,
  Add: AddRegular,
  FolderOpen: FolderOpenRegular,
  History: HistoryRegular,
  Toolbox: ToolboxRegular,
  People: PeopleRegular,
  ArrowSync: ArrowSyncRegular,
  CheckmarkCircle: CheckmarkCircleRegular,
  ArrowClockwise: ArrowClockwiseRegular,
  ArrowUpload: ArrowUploadRegular,
  Search: SearchRegular,
  Clock: ClockRegular,
  DataHistogram: DataHistogramRegular,
  Alert: AlertRegular,
  Edit: EditRegular,
  Grid: GridRegular,
  Ruler: RulerRegular,
  LockClosed: LockClosedRegular,
  Open: OpenRegular,
  Save: SaveRegular,
  ArrowLeft: ArrowLeftRegular,
  DocumentAdd: DocumentAddRegular,
  Share: ShareRegular,
};

export const HubIcon: React.FC<{ icon: string; size?: number; style?: React.CSSProperties }> = ({
  icon,
  size = 20,
  style,
}) => {
  const Cmp = DESIGN_HUB_ICONS[icon];
  if (!Cmp) return null;
  return <Cmp style={{ fontSize: size, ...style }} />;
};
