/**
 * DesignMenuBar
 * Contextual top menu bar shown on the drawing editor pages
 * (HVAC Designer, EEZ Studio, Tstat10 Simulator).
 *
 * Commands are broadcast as `t3-editor-command` CustomEvents so each engine
 * can subscribe to the ones it understands; the hub also handles navigation
 * actions directly.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  makeStyles,
} from '@fluentui/react-components';
import {
  HomeRegular,
  DocumentAddRegular,
  SaveRegular,
  ArrowUploadRegular,
  FolderOpenRegular,
  SignOutRegular,
  ArrowUndoRegular,
  ArrowRedoRegular,
  CutRegular,
  CopyRegular,
  ClipboardPasteRegular,
  DeleteRegular,
  ZoomInRegular,
  ZoomOutRegular,
  ArrowResetRegular,
  GridRegular,
  RulerRegular,
  LockClosedRegular,
  AddRegular,
  GroupRegular,
  GroupDismissRegular,
  AlignLeftRegular,
  AlignCenterHorizontalRegular,
  AlignRightRegular,
  AlignTopRegular,
  AlignCenterVerticalRegular,
  AlignBottomRegular,
  ArrowUpRegular,
  ArrowDownRegular,
  SettingsRegular,
  BookRegular,
  InfoRegular,
  FlowRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '2px 10px',
    minHeight: '34px',
    backgroundColor: 'var(--t3-color-header-background)',
    borderBottom: '1px solid var(--t3-color-header-border)',
    flexShrink: 0,
    userSelect: 'none',
  },
  menuItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--t3-color-header-text)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    '&:hover': {
      backgroundColor: 'var(--t3-color-primary-hover)',
    },
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 12px 0 4px',
    borderRight: '1px solid rgba(255,255,255,0.15)',
    marginRight: '6px',
    color: 'var(--t3-color-header-text)',
    cursor: 'pointer',
  },
  brandTitle: {
    fontWeight: 700,
    fontSize: '13px',
  },
  menuItemText: {
    fontSize: '13px',
  },
});

interface MenuDef {
  label: string;
  items: { label?: string; icon?: React.ReactNode; command?: string; divider?: boolean; action?: () => void }[];
}

export const DesignMenuBar: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();

  const emit = (command: string) =>
    window.dispatchEvent(new CustomEvent('t3-editor-command', { detail: { command } }));

  const goDesign = () => navigate('/t3000/design');
  const goNew = () => navigate('/t3000/hvac-designer');

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'Back to Design Hub', icon: <HomeRegular />, action: goDesign },
        { label: 'New Drawing', icon: <DocumentAddRegular />, action: goNew },
        { label: 'Open…', icon: <FolderOpenRegular />, action: goDesign },
        { divider: true },
        { label: 'Save', icon: <SaveRegular />, command: 'save' },
        { label: 'Import SVG / DXF…', icon: <ArrowUploadRegular />, command: 'import' },
        { divider: true },
        { label: 'Exit to Home', icon: <SignOutRegular />, action: () => navigate('/t3000') },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', icon: <ArrowUndoRegular />, command: 'undo' },
        { label: 'Redo', icon: <ArrowRedoRegular />, command: 'redo' },
        { divider: true },
        { label: 'Cut', icon: <CutRegular />, command: 'cut' },
        { label: 'Copy', icon: <CopyRegular />, command: 'copy' },
        { label: 'Paste', icon: <ClipboardPasteRegular />, command: 'paste' },
        { label: 'Delete', icon: <DeleteRegular />, command: 'delete' },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', icon: <ZoomInRegular />, command: 'zoom-in' },
        { label: 'Zoom Out', icon: <ZoomOutRegular />, command: 'zoom-out' },
        { label: 'Reset Zoom', icon: <ArrowResetRegular />, command: 'zoom-reset' },
        { divider: true },
        { label: 'Toggle Grid', icon: <GridRegular />, command: 'toggle-grid' },
        { label: 'Toggle Rulers', icon: <RulerRegular />, command: 'toggle-rulers' },
        { label: 'Toggle Snap to Grid', icon: <LockClosedRegular />, command: 'toggle-snap' },
      ],
    },
    {
      label: 'Draw',
      items: [
        { label: 'Insert Symbol…', icon: <AddRegular />, command: 'insert-symbol' },
        { divider: true },
        { label: 'Group', icon: <GroupRegular />, command: 'group' },
        { label: 'Ungroup', icon: <GroupDismissRegular />, command: 'ungroup' },
        { divider: true },
        { label: 'Align Left', icon: <AlignLeftRegular />, command: 'align-left' },
        { label: 'Align Center H', icon: <AlignCenterHorizontalRegular />, command: 'align-center-h' },
        { label: 'Align Right', icon: <AlignRightRegular />, command: 'align-right' },
        { label: 'Align Top', icon: <AlignTopRegular />, command: 'align-top' },
        { label: 'Align Center V', icon: <AlignCenterVerticalRegular />, command: 'align-center-v' },
        { label: 'Align Bottom', icon: <AlignBottomRegular />, command: 'align-bottom' },
      ],
    },
    {
      label: 'Arrange',
      items: [
        { label: 'Bring to Front', icon: <ArrowUpRegular />, command: 'bring-to-front' },
        { label: 'Send to Back', icon: <ArrowDownRegular />, command: 'send-to-back' },
        { divider: true },
        { label: 'Group', icon: <GroupRegular />, command: 'group' },
        { label: 'Ungroup', icon: <GroupDismissRegular />, command: 'ungroup' },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Bind to Device…', icon: <FlowRegular />, command: 'bind-device' },
        { divider: true },
        { label: 'Options', icon: <SettingsRegular />, action: () => navigate('/t3000/settings') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', icon: <BookRegular />, action: () => navigate('/t3000/documentation') },
        { label: 'About Design Hub', icon: <InfoRegular />, command: 'about' },
      ],
    },
  ];

  const renderMenu = (menu: MenuDef) => (
    <Menu key={menu.label}>
      <MenuTrigger disableButtonEnhancement>
        <div className={styles.menuItem}>{menu.label}</div>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {menu.items.map((item, i) =>
            item.divider ? (
              <MenuDivider key={`d-${i}`} />
            ) : (
              <MenuItem
                key={`${menu.label}-${i}`}
                icon={item.icon as any}
                onClick={() => (item.action ? item.action() : emit(item.command!))}
                className={styles.menuItemText}
              >
                {item.label}
              </MenuItem>
            )
          )}
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  return (
    <div className={styles.bar}>
      <div className={styles.brand} onClick={goDesign}>
        <FlowRegular style={{ fontSize: 16 }} />
        <span className={styles.brandTitle}>Design</span>
      </div>
      {menus.map(renderMenu)}
    </div>
  );
};
