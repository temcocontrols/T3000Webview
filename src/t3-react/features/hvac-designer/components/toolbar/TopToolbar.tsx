/**
 * Top Toolbar Component
 * Main toolbar with drawing tools and actions (2 rows layout)
 */

import React, { useState } from 'react';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Button,
  makeStyles,
} from '@fluentui/react-components';
import {
  ArrowUndoRegular,
  ArrowRedoRegular,
  CopyRegular,
  CutRegular,
  ClipboardPasteRegular,
  DeleteRegular,
  SaveRegular,
  FolderOpenRegular,
  ZoomInRegular,
  ZoomOutRegular,
  GridRegular,
  RulerRegular,
  LockClosedRegular,
  LockOpenRegular,
  SelectAllOnRegular,
  ArrowRotateClockwiseRegular,
  ArrowRotateCounterclockwiseRegular,
  ArrowUpRegular,
  ArrowDownRegular,
  GroupRegular,
  GroupDismissRegular,
  AlignLeftRegular,
  AlignCenterHorizontalRegular,
  AlignRightRegular,
  AlignTopRegular,
  AlignCenterVerticalRegular,
  AlignBottomRegular,
  AddRegular,
  EraserRegular,
  CursorRegular,
  ImageAddRegular,
  ResizeImageRegular,
  ImageRegular,
  ArrowResetRegular,
  ChevronDownRegular,
  NavigationRegular,
  ArrowLeftRegular,
} from '@fluentui/react-icons';
import T3Gv from '@/lib/t3-hvac/Data/T3Gv';
import EvtOpt from '@/lib/t3-hvac/Event/EvtOpt';

const toolOpt = EvtOpt.toolOpt;
// Synthetic event for ToolOpt methods that expect a DOM event
const noopEvent = { preventDefault: () => {}, stopPropagation: () => {} } as any;

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    backgroundColor: '#f5f5f5',
    margin: '0px 2px',
    height: '60px',
    borderBottom: '1px solid #e1e1e1',
    alignItems: 'center',
    gap: '0',
    overflow: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c1c1c1 #f5f5f5',
    '&::-webkit-scrollbar': {
      width: '6px',
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: '#f5f5f5',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#c1c1c1',
      borderRadius: '3px',
      '&:hover': {
        backgroundColor: '#a1a1a1',
      },
    },
  },
  group: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'center',
    gap: '2px',
    padding: '2px 6px',
    height: '100%',
  },
  toolItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: '#323130',
    fontSize: '11px',
    fontWeight: 'normal',
    padding: '2px 6px',
    cursor: 'pointer',
    borderRadius: '2px',
    userSelect: 'none',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    '&[data-disabled="true"]': {
      color: '#a19f9d',
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },
  toolIcon: {
    fontSize: '14px',
  },
  leftSection: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0',
    flexShrink: 0,
    width: '115px',
    borderRight: '1px solid rgba(0,0,0,0.1)',
  },
  leftRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    height: '30px',
    gap: '6px',
  },
  leftTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#323130',
    whiteSpace: 'nowrap',
  },
  leftVersion: {
    fontSize: '10px',
    color: '#605e5c',
    whiteSpace: 'nowrap',
  },
  divider: {
    width: '1px',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    // margin: '4px 1px',
    flexShrink: 0,
  },
  menuItem: {
    fontSize: '13px',
    fontWeight: 'normal',
  },
});

interface TopToolbarProps {
  onToggleLeftPanel: () => void;
  onNavigateBack: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ onToggleLeftPanel, onNavigateBack }) => {
  const styles = useStyles();

  // Use existing Hvac library for zoom operations
  const zoomIn = () => T3Gv.docUtil?.SetZoomLevel((T3Gv.docUtil?.GetZoomFactor() ?? 100) + 10);
  const zoomOut = () => T3Gv.docUtil?.SetZoomLevel((T3Gv.docUtil?.GetZoomFactor() ?? 100) - 10);
  const [showRotateMenu, setShowRotateMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showFlipMenu, setShowFlipMenu] = useState(false);
  const [showMakeSameMenu, setShowMakeSameMenu] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [zoomValue, setZoomValue] = useState(100);

  const handleSave = async () => {
    toolOpt.SaveAct();
  };

  const handleDelete = () => {
    toolOpt.DeleteAct(noopEvent);
  };

  const handleDuplicate = () => {
    toolOpt.DuplicateAct(noopEvent);
  };

  const handleGroup = () => {
    toolOpt.GroupAct(noopEvent);
  };

  const handleUngroup = () => {
    toolOpt.UnGroupAct(noopEvent);
  };

  const handleBringToFront = () => {
    toolOpt.ShapeBringToFrontAct(noopEvent);
  };

  const handleSendToBack = () => {
    toolOpt.ShapeSendToBackAct(noopEvent);
  };

  const handleCopy = () => {
    toolOpt.CopyAct(noopEvent);
  };

  const handleCut = () => {
    toolOpt.CutAct(noopEvent);
  };

  const handlePaste = () => {
    toolOpt.PasteAct(noopEvent);
  };

  const handleUndo = () => {
    toolOpt.UndoAct(noopEvent);
  };

  const handleRedo = () => {
    toolOpt.RedoAct(noopEvent);
  };

  const handleRotate = (angle: number) => {
    toolOpt.RotateAct(noopEvent, angle);
    setShowRotateMenu(false);
  };

  const handleAlign = (type: string) => {
    toolOpt.ShapeAlignAct(type);
    setShowAlignMenu(false);
  };

  const handleFlip = (type: string) => {
    if (type === 'horizontal') toolOpt.ShapeFlipHorizontalAct(noopEvent);
    else toolOpt.ShapeFlipVerticalAct(noopEvent);
    setShowFlipMenu(false);
  };

  const handleMakeSame = (type: number) => {
    toolOpt.MakeSameSizeAct(noopEvent, type);
    setShowMakeSameMenu(false);
  };

  const handleBackground = (color: string) => {
    toolOpt.LibSetBackgroundColorAct(color);
    setShowBackgroundMenu(false);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 100;
    setZoomValue(value);
    T3Gv.docUtil?.SetZoomLevel(value);
  };

  const handleLock = () => {
    toolOpt.LibLockAct(false);
  };

  const handleUnlock = () => {
    toolOpt.LibUnlockAct(false);
  };

  const handleResetZoom = () => {
    toolOpt.ResetScaleAct(noopEvent);
    setZoomValue(100);
  };

  const handleInsert = () => {
    // Insert is disabled in both React and Vue
  };

  return (
    <div className={styles.container}>
      {/* Left: Title + version + controls (2 rows) */}
      <div className={styles.leftSection}>
        <div className={styles.leftRow}>
          <span className={styles.leftTitle}>T3 Hvac</span>
          <Button
            appearance="subtle"
            size="small"
            icon={<NavigationRegular style={{ fontSize: '14px' }} />}
            onClick={onToggleLeftPanel}
            title="Collapse panel"
          />
        </div>
        <div className={styles.leftRow}>
          <span className={styles.leftVersion}>v1.0</span>
          <Button
            appearance="subtle"
            size="small"
            icon={<ArrowLeftRegular style={{ fontSize: '14px' }} />}
            onClick={onNavigateBack}
            title="Back to main page"
          />
        </div>
      </div>

      {/* Group 1: Selection */}
      <div className={styles.group}>
        <div className={styles.toolItem} onClick={() => toolOpt.SelectAct(noopEvent)}>
          <CursorRegular className={styles.toolIcon} />
          <span>Select</span>
        </div>
        <div className={styles.toolItem} onClick={handleLock}>
          <LockClosedRegular className={styles.toolIcon} />
          <span>Lock</span>
        </div>
        <div className={styles.toolItem} onClick={() => toolOpt.SelectAllObjects()}>
          <SelectAllOnRegular className={styles.toolIcon} />
          <span>Select All</span>
        </div>
        <div className={styles.toolItem} onClick={handleUnlock}>
          <LockOpenRegular className={styles.toolIcon} />
          <span>Unlock</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Group 2: Clipboard */}
      <div className={styles.group}>
        <div className={styles.toolItem} onClick={handlePaste}>
          <ClipboardPasteRegular className={styles.toolIcon} />
          <span>Paste</span>
        </div>
        <div className={styles.toolItem} onClick={handleCopy}>
          <CopyRegular className={styles.toolIcon} />
          <span>Copy</span>
        </div>
        <div className={styles.toolItem} onClick={handleCut}>
          <CutRegular className={styles.toolIcon} />
          <span>Cut</span>
        </div>
        <div className={styles.toolItem} onClick={handleDelete}>
          <DeleteRegular className={styles.toolIcon} />
          <span>Delete</span>
        </div>
        <div className={styles.toolItem} onClick={handleDuplicate}>
          <AddRegular className={styles.toolIcon} />
          <span>Duplicate</span>
        </div>
        <div className={styles.toolItem} onClick={handleInsert}>
          <ImageAddRegular className={styles.toolIcon} />
          <span>Insert</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Group 3: History & Save */}
      <div className={styles.group}>
        <div className={styles.toolItem} onClick={handleUndo}>
          <ArrowUndoRegular className={styles.toolIcon} />
          <span>Undo</span>
        </div>
        <div className={styles.toolItem} onClick={handleRedo}>
          <ArrowRedoRegular className={styles.toolIcon} />
          <span>Redo</span>
        </div>
        <div className={styles.toolItem} onClick={handleSave}>
          <SaveRegular className={styles.toolIcon} />
          <span>Save</span>
        </div>
        <div className={styles.toolItem} onClick={() => toolOpt.ClearAct()}>
          <EraserRegular className={styles.toolIcon} />
          <span>Clear</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Group 4: Transform */}
      <div className={styles.group}>
        <Menu open={showRotateMenu} onOpenChange={(_e, data) => setShowRotateMenu(data.open)}>
          <MenuTrigger>
            <div className={styles.toolItem}>
              <ArrowRotateClockwiseRegular className={styles.toolIcon} />
              <span>Rotate</span>
              <ChevronDownRegular style={{ fontSize: '10px' }} />
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(45)}>45°</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(90)}>90°</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(180)}>180°</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(270)}>270°</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <Menu open={showAlignMenu} onOpenChange={(_e, data) => setShowAlignMenu(data.open)}>
          <MenuTrigger>
            <div className={styles.toolItem}>
              <AlignCenterHorizontalRegular className={styles.toolIcon} />
              <span>Align</span>
              <ChevronDownRegular style={{ fontSize: '10px' }} />
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem className={styles.menuItem} onClick={() => handleAlign('lefts')}>Align Left</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignCenterHorizontalRegular />} onClick={() => handleAlign('centers')}>Align Center H</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignRightRegular />} onClick={() => handleAlign('rights')}>Align Right</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignTopRegular />} onClick={() => handleAlign('tops')}>Align Top</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignCenterVerticalRegular />} onClick={() => handleAlign('middles')}>Align Center V</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignBottomRegular />} onClick={() => handleAlign('bottoms')}>Align Bottom</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <Menu open={showFlipMenu} onOpenChange={(_e, data) => setShowFlipMenu(data.open)}>
          <MenuTrigger>
            <div className={styles.toolItem}>
              <ArrowRotateCounterclockwiseRegular className={styles.toolIcon} />
              <span>Flip</span>
              <ChevronDownRegular style={{ fontSize: '10px' }} />
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem className={styles.menuItem} onClick={() => handleFlip('horizontal')}>Flip Horizontal</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleFlip('vertical')}>Flip Vertical</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <Menu open={showMakeSameMenu} onOpenChange={(_e, data) => setShowMakeSameMenu(data.open)}>
          <MenuTrigger>
            <div className={styles.toolItem}>
              <ResizeImageRegular className={styles.toolIcon} />
              <span>Make same</span>
              <ChevronDownRegular style={{ fontSize: '10px' }} />
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem className={styles.menuItem} onClick={() => handleMakeSame(2)}>Same Width</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleMakeSame(1)}>Same Height</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleMakeSame(3)}>Same Size</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      <div className={styles.divider} />

      {/* Group 5: Arrange */}
      <div className={styles.group}>
        <div className={styles.toolItem} onClick={handleGroup}>
          <GroupRegular className={styles.toolIcon} />
          <span>Group</span>
        </div>
        <div className={styles.toolItem} onClick={handleBringToFront}>
          <ArrowUpRegular className={styles.toolIcon} />
          <span>Bring to Front</span>
        </div>
        <div className={styles.toolItem} onClick={handleUngroup}>
          <GroupDismissRegular className={styles.toolIcon} />
          <span>Ungroup</span>
        </div>
        <div className={styles.toolItem} onClick={handleSendToBack}>
          <ArrowDownRegular className={styles.toolIcon} />
          <span>Send to Back</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Group 6: Library */}
      <div className={styles.group}>
        <div className={styles.toolItem} onClick={() => toolOpt.AddToLibraryAct()}>
          <AddRegular className={styles.toolIcon} />
          <span>Add to Library</span>
        </div>
        <div className={styles.toolItem} onClick={() => toolOpt.LoadLibraryAct()}>
          <FolderOpenRegular className={styles.toolIcon} />
          <span>Load Library</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Group 7: View & Zoom */}
      <div className={styles.group}>
        <Menu open={showBackgroundMenu} onOpenChange={(_e, data) => setShowBackgroundMenu(data.open)}>
          <MenuTrigger>
            <div className={styles.toolItem}>
              <ImageRegular className={styles.toolIcon} />
              <span>Background</span>
              <ChevronDownRegular style={{ fontSize: '10px' }} />
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem className={styles.menuItem} onClick={() => handleBackground('white')}>White</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleBackground('gray')}>Gray</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleBackground('black')}>Black</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleBackground('custom')}>Custom...</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <div className={styles.toolItem} onClick={() => {
          const dc = T3Gv.docUtil?.docConfig;
          if (dc) { dc.showRulers = !dc.showRulers; T3Gv.docUtil?.UpdateRulerVisibility(); }
        }}>
          <RulerRegular className={styles.toolIcon} />
          <span>Rulers</span>
        </div>
        <div className={styles.toolItem} onClick={() => {
          const dc = T3Gv.docUtil?.docConfig;
          if (dc) { dc.showGrid = !dc.showGrid; T3Gv.docUtil?.UpdateGrid(); }
        }}>
          <GridRegular className={styles.toolIcon} />
          <span>Grid</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 4px' }}>
          <div className={styles.toolItem} onClick={zoomOut} style={{ padding: '2px 4px' }}>
            <ZoomOutRegular className={styles.toolIcon} />
          </div>
          <input
            type="number"
            value={zoomValue}
            onChange={handleZoomChange}
            style={{
              width: '50px',
              height: '22px',
              fontSize: '11px',
              padding: '2px 4px',
              border: '1px solid #ccc',
              borderRadius: '2px',
              textAlign: 'center',
            }}
          />
          <span style={{ fontSize: '11px', color: '#323130' }}>%</span>
          <div className={styles.toolItem} onClick={zoomIn} style={{ padding: '2px 4px' }}>
            <ZoomInRegular className={styles.toolIcon} />
          </div>
        </div>
        <div className={styles.toolItem} onClick={handleResetZoom}>
          <ArrowResetRegular className={styles.toolIcon} />
          <span>Reset Zoom</span>
        </div>
      </div>
    </div>
  );
};

