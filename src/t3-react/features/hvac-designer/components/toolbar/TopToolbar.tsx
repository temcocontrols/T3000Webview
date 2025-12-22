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
  ArrowExportRegular,
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
} from '@fluentui/react-icons';
import { useHvacDesignerStore } from '../../store/designerStore';
import { useDrawing } from '../../hooks/useDrawing';
import { useCanvas } from '../../hooks/useCanvas';

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

export const TopToolbar: React.FC = () => {
  const styles = useStyles();
  const {
    canvas,
    history,
    selectedShapeIds,
    shapes,
    isDirty,
    undo,
    redo,
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,
    deleteShapes,
    duplicateShapes,
    toggleGrid,
    toggleRulers,
    selectAll,
    clearSelection,
    groupShapes,
    ungroupShape,
    clearDrawing,
  } = useHvacDesignerStore();

  const { saveDrawing, exportAs, createNew, isSaving } = useDrawing();
  const { zoomIn, zoomOut } = useCanvas();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showRotateMenu, setShowRotateMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showFlipMenu, setShowFlipMenu] = useState(false);
  const [showMakeSameMenu, setShowMakeSameMenu] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [zoomValue, setZoomValue] = useState(100);

  const handleSave = async () => {
    try {
      await saveDrawing();
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleExport = async (format: 'json' | 'svg' | 'png' | 'pdf') => {
    try {
      await exportAs({ format });
      setShowExportMenu(false);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleDelete = () => {
    if (selectedShapeIds.length > 0) {
      deleteShapes(selectedShapeIds);
    }
  };

  const handleDuplicate = () => {
    if (selectedShapeIds.length > 0) {
      duplicateShapes(selectedShapeIds);
    }
  };

  const handleGroup = () => {
    if (selectedShapeIds.length > 1) {
      groupShapes(selectedShapeIds);
    }
  };

  const handleRotate = (angle: number) => {
    // TODO: Implement rotation
    console.log('Rotate:', angle);
    setShowRotateMenu(false);
  };

  const handleAlign = (type: string) => {
    // TODO: Implement alignment
    console.log('Align:', type);
    setShowAlignMenu(false);
  };

  const handleFlip = (type: string) => {
    // TODO: Implement flip
    console.log('Flip:', type);
    setShowFlipMenu(false);
  };

  const handleMakeSame = (type: string) => {
    // TODO: Implement make same
    console.log('Make same:', type);
    setShowMakeSameMenu(false);
  };

  const handleBackground = (color: string) => {
    // TODO: Implement background change
    console.log('Background:', color);
    setShowBackgroundMenu(false);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 100;
    setZoomValue(value);
    // TODO: Apply zoom
  };

  const handleLock = () => {
    // TODO: Implement lock
    console.log('Lock');
  };

  const handleUnlock = () => {
    // TODO: Implement unlock
    console.log('Unlock');
  };

  const handleInsert = () => {
    // TODO: Implement insert
    console.log('Insert');
  };

  const handleResetZoom = () => {
    setZoomValue(100);
    // TODO: Reset zoom to 100%
  };

  return (
    <div className={styles.container}>
      {/* Group 1: Selection */}
      <div className={styles.group}>
        <div className={styles.toolItem} onClick={clearSelection}>
          <CursorRegular className={styles.toolIcon} />
          <span>Select</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0} onClick={selectedShapeIds.length > 0 ? handleLock : undefined}>
          <LockClosedRegular className={styles.toolIcon} />
          <span>Lock</span>
        </div>
        <div className={styles.toolItem} onClick={selectAll}>
          <SelectAllOnRegular className={styles.toolIcon} />
          <span>Select All</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0} onClick={selectedShapeIds.length > 0 ? handleUnlock : undefined}>
          <LockOpenRegular className={styles.toolIcon} />
          <span>Unlock</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Group 2: Clipboard */}
      <div className={styles.group}>
        <div className={styles.toolItem} onClick={pasteFromClipboard}>
          <ClipboardPasteRegular className={styles.toolIcon} />
          <span>Paste</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0} onClick={selectedShapeIds.length > 0 ? copyToClipboard : undefined}>
          <CopyRegular className={styles.toolIcon} />
          <span>Copy</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0} onClick={selectedShapeIds.length > 0 ? cutToClipboard : undefined}>
          <CutRegular className={styles.toolIcon} />
          <span>Cut</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0} onClick={selectedShapeIds.length > 0 ? handleDelete : undefined}>
          <DeleteRegular className={styles.toolIcon} />
          <span>Delete</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0} onClick={selectedShapeIds.length > 0 ? handleDuplicate : undefined}>
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
        <div className={styles.toolItem} data-disabled={history.past.length === 0} onClick={history.past.length > 0 ? undo : undefined}>
          <ArrowUndoRegular className={styles.toolIcon} />
          <span>Undo</span>
        </div>
        <div className={styles.toolItem} data-disabled={!isDirty || isSaving} onClick={isDirty && !isSaving ? handleSave : undefined}>
          <SaveRegular className={styles.toolIcon} />
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </div>
        <div className={styles.toolItem} data-disabled={history.future.length === 0} onClick={history.future.length > 0 ? redo : undefined}>
          <ArrowRedoRegular className={styles.toolIcon} />
          <span>Redo</span>
        </div>
        <div className={styles.toolItem} onClick={clearDrawing}>
          <EraserRegular className={styles.toolIcon} />
          <span>Clear</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Group 4: Transform */}
      <div className={styles.group}>
        <Menu open={showRotateMenu} onOpenChange={(_e, data) => setShowRotateMenu(data.open)}>
          <MenuTrigger>
            <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0}>
              <ArrowRotateClockwiseRegular className={styles.toolIcon} />
              <span>Rotate</span>
              <ChevronDownRegular style={{ fontSize: '10px' }} />
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(0)}>0°</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(45)}>45°</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(90)}>90°</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(180)}>180°</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleRotate(270)}>270°</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <Menu open={showAlignMenu} onOpenChange={(_e, data) => setShowAlignMenu(data.open)}>
          <MenuTrigger>
            <div className={styles.toolItem} data-disabled={selectedShapeIds.length < 2}>
              <AlignCenterHorizontalRegular className={styles.toolIcon} />
              <span>Align</span>
              <ChevronDownRegular style={{ fontSize: '10px' }} />
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem className={styles.menuItem} icon={<AlignLeftRegular />} onClick={() => handleAlign('left')}>Align Left</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignCenterHorizontalRegular />} onClick={() => handleAlign('center-h')}>Align Center H</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignRightRegular />} onClick={() => handleAlign('right')}>Align Right</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignTopRegular />} onClick={() => handleAlign('top')}>Align Top</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignCenterVerticalRegular />} onClick={() => handleAlign('center-v')}>Align Center V</MenuItem>
              <MenuItem className={styles.menuItem} icon={<AlignBottomRegular />} onClick={() => handleAlign('bottom')}>Align Bottom</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <Menu open={showFlipMenu} onOpenChange={(_e, data) => setShowFlipMenu(data.open)}>
          <MenuTrigger>
            <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0}>
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
            <div className={styles.toolItem} data-disabled={selectedShapeIds.length < 2}>
              <ResizeImageRegular className={styles.toolIcon} />
              <span>Make same</span>
              <ChevronDownRegular style={{ fontSize: '10px' }} />
            </div>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem className={styles.menuItem} onClick={() => handleMakeSame('width')}>Same Width</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleMakeSame('height')}>Same Height</MenuItem>
              <MenuItem className={styles.menuItem} onClick={() => handleMakeSame('size')}>Same Size</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      <div className={styles.divider} />

      {/* Group 5: Arrange */}
      <div className={styles.group}>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length < 2} onClick={selectedShapeIds.length >= 2 ? handleGroup : undefined}>
          <GroupRegular className={styles.toolIcon} />
          <span>Group</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0}>
          <ArrowUpRegular className={styles.toolIcon} />
          <span>Bring to Front</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0}>
          <GroupDismissRegular className={styles.toolIcon} />
          <span>Ungroup</span>
        </div>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0}>
          <ArrowDownRegular className={styles.toolIcon} />
          <span>Send to Back</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Group 6: Library */}
      <div className={styles.group}>
        <div className={styles.toolItem} data-disabled={selectedShapeIds.length === 0}>
          <AddRegular className={styles.toolIcon} />
          <span>Add to Library</span>
        </div>
        <div className={styles.toolItem}>
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
        <div className={styles.toolItem} onClick={toggleRulers}>
          <RulerRegular className={styles.toolIcon} />
          <span>Rulers</span>
        </div>
        <div className={styles.toolItem} onClick={toggleGrid}>
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

