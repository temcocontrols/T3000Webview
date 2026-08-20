/**
 * T3ContextMenu — Context menu for the HVAC designer.
 *
 * ## Architecture
 *
 * The core library (t3-hvac) triggers context menus by setting `ctxMenuConfig.value`
 * — a plain reactive ref in `RefConstant.ts`. This happens on right-click via
 * `UIUtil.ShowContextMenu()` → `QuasarUtil.ShowContextMenu()`. The config carries
 * `{ isShow, from, type }` where `from` identifies the source (WorkArea, Shape,
 * Connector, etc.) and `type` selects the menu variant (Default, ReadOnly, Editable).
 *
 * This component polls `ctxMenuConfig` every 150ms (same mechanism the original
 * used) because the ref is not hooked into React's reactivity system. When `isShow`
 * flips to true, it fetches menu items from `CtxMenuUtil.GetContextMenu()` and
 * renders them using Fluent UI's `Menu` component.
 *
 * ## Icon handling
 *
 * `CtxMenuUtil` references icon components (e.g. `CopyOutlined`).
 * We resolve them to Fluent UI equivalents via the component's `displayName`
 * property against `ICON_MAP`. Unknown icons fall back to `MoreHorizontalRegular`.
 *
 * ## Positioning
 *
 * The menu is rendered as a fixed-position `<div>` at the right-click
 * coordinates (converted from SVG document space to window space via
 * `ConvertDocToWindowCoords`). Click-outside and Escape close the menu.
 */

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  MenuItem,
  MenuDivider,
} from '@fluentui/react-components';
import CtxMenuUtil from '@/lib/t3-hvac/Doc/CtxMenuUtil';
import { ctxMenuConfig } from '@/lib/t3-hvac/Data/Constant/RefConstant';
import type { ICtxMenuConfig } from '@/lib/t3-hvac/Data/Constant/RefConstant';
import T3Gv from '@/lib/t3-hvac/Data/T3Gv';

// ── Types ─────────────────────────────────────────────────────────────────
// Re-created from CtxMenuUtil.ts (these types are local to that file).
// MenuConfigItem = MenuItem | SubMenuItem | MenuDivider

interface MenuItemBase {
  key: string;
  title: string;
  icon?: any;           // icon component (resolved via displayName)
  shortcut?: string;    // e.g. "Ctrl+C"
  disabled?: boolean;
}

interface MenuItem extends MenuItemBase {
  type: 'item';
  onClick?: (key: string) => void;  // fires CtxMenuUtil.HandleMenuClick internally
}

interface SubMenuItem extends MenuItemBase {
  type: 'submenu';
  children: (MenuItem | MenuDivider)[];
  expandIcon?: any;
}

interface MenuDivider {
  type: 'divider';
  key: string;
}

type MenuConfigItem = MenuItem | SubMenuItem | MenuDivider;

// ── Icon mapping ──────────────────────────────────────────────────────────
// CtxMenuUtil menu items carry icon components. We resolve them to Fluent UI
// icons by checking the component's displayName (e.g. "CopyOutlined").
// Unknown icons fall back to MoreHorizontalRegular.

import {
  CopyRegular,
  CutRegular,
  ClipboardPasteRegular,
  DeleteRegular,
  ArrowUndoRegular,
  ArrowRedoRegular,
  SaveRegular,
  LockClosedRegular,
  LockOpenRegular,
  ArrowRotateClockwiseRegular,
  ArrowRotateCounterclockwiseRegular,
  GroupRegular,
  GroupDismissRegular,
  DocumentRegular,
  AddRegular,
  ArrowForwardRegular,
  ChevronRightRegular,
  MoreHorizontalRegular,
  DismissRegular,
  AlignLeftRegular,
  AlignCenterRegular,
  AlignRightRegular,
  AlignTopRegular,
  AlignBottomRegular,
  ArrowSyncRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
  SelectAllOnRegular,
  ResizeLargeRegular,
  ColorLineRegular,
  ShapeSubtractRegular,
} from '@fluentui/react-icons';

// ── Icon resolution ───────────────────────────────────────────────────────
// CtxMenuUtil items carry icon components. We resolve them to Fluent UI
// equivalents using the component's displayName (e.g. "CopyOutlined").

/** Map CtxMenuUtil icon displayNames to Fluent UI icon components. */
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  // Selection
  SelectOutlined: SelectAllOnRegular,
  CheckOutlined: SelectAllOnRegular,
  // Clipboard
  CopyOutlined: CopyRegular,
  ScissorOutlined: CutRegular,
  SnippetsOutlined: ClipboardPasteRegular,
  FileAddOutlined: AddRegular,
  // Edit
  DeleteOutlined: DeleteRegular,
  UndoOutlined: ArrowUndoRegular,
  RedoOutlined: ArrowRedoRegular,
  SaveOutlined: SaveRegular,
  ClearOutlined: DismissRegular,
  // Lock
  LockOutlined: LockClosedRegular,
  UnlockOutlined: LockOpenRegular,
  BlockOutlined: LockClosedRegular,
  // Rotate
  RotateRightOutlined: ArrowRotateClockwiseRegular,
  RotateLeftOutlined: ArrowRotateCounterclockwiseRegular,
  // Align
  AlignLeftOutlined: AlignLeftRegular,
  // Flip
  SwapOutlined: ArrowSyncRegular,
  VerticalAlignTopOutlined: ArrowSortUpRegular,
  VerticalAlignBottomOutlined: ArrowSortDownRegular,
  // Arrange
  ApartmentOutlined: ArrowSortUpRegular,
  NodeIndexOutlined: ArrowSortDownRegular,
  CompressOutlined: ResizeLargeRegular,
  // Group
  GroupOutlined: GroupRegular,
  UngroupOutlined: GroupDismissRegular,
  // Other
  FileTextOutlined: DocumentRegular,
  PlusOutlined: AddRegular,
  EditOutlined: DocumentRegular,
  RightOutlined: ArrowForwardRegular,
  EllipsisOutlined: MoreHorizontalRegular,
  SettingOutlined: MoreHorizontalRegular,
  ArrowUpOutlined: ArrowSortUpRegular,
  BgColorsOutlined: ColorLineRegular,
  BorderOutlined: ShapeSubtractRegular,
  CloseOutlined: DismissRegular,
  // Fallback
  _default: MoreHorizontalRegular,
};

/**
 * Resolve an icon from a CtxMenuUtil menu item into a Fluent UI React element.
 *
 * Resolution order:
 * 1. Already a React element — return as-is.
 * 2. A string key — look up in ICON_MAP.
 * 3. A component with a displayName — match against ICON_MAP (e.g. "CopyOutlined").
 * 4. Any other component — attempt React.createElement as last resort.
 * 5. All else fails — return the _default fallback.
 */
function resolveIcon(iconDef: any): React.ReactElement | undefined {
  if (!iconDef) return undefined;
  if (React.isValidElement(iconDef)) return iconDef;
  if (typeof iconDef === 'string') {
    const Component = ICON_MAP[iconDef] || ICON_MAP._default;
    return React.createElement(Component, { fontSize: 16 });
  }
  // Try the component's displayName or name for lookup
  const name = (iconDef as any)?.displayName || (iconDef as any)?.name || '';
  if (name && ICON_MAP[name]) {
    return React.createElement(ICON_MAP[name], { fontSize: 16 });
  }
  // Last resort: render the component directly
  try {
    return React.createElement(iconDef as any, { fontSize: 16 });
  } catch {
    const Fallback = ICON_MAP._default;
    return React.createElement(Fallback, { fontSize: 16 });
  }
}

/**
 * Render a single MenuConfigItem into Fluent UI menu element(s).
 *
 * - `divider` → `<MenuDivider>` (key made unique with an index counter)
 * - `submenu` → disabled header `<MenuItem>` + indented children + trailing divider
 * - `item`    → `<MenuItem>` with icon, shortcut, and click handler
 *
 * Submenus are rendered inline (not nested popups) because Fluent UI's
 * `<Menu>` doesn't natively support submenus. The header item is disabled
 * and styled as a section label.
 *
 * @param dividerIndex — mutable counter to ensure unique divider keys.
 *   CtxMenuUtil defines all dividers with key "divider", causing React warnings.
 */
function renderMenuItem(
  item: MenuConfigItem,
  onClose: () => void,
  dividerIndex: { value: number },
): React.ReactNode {
  if (item.type === 'divider') {
    const key = `divider-${dividerIndex.value++}`;
    return <MenuDivider key={key} />;
  }

  if (item.type === 'submenu') {
    return <SubMenuWrapper item={item} onClose={onClose} dividerIndex={dividerIndex} />;
  }

  return (
    <MenuItem
      key={item.key}
      icon={resolveIcon(item.icon)}
      onClick={() => {
        if (item.onClick) {
          item.onClick(item.key);
        }
        onClose();
      }}
      disabled={item.disabled}
      secondaryContent={item.shortcut}
    >
      {item.title}
    </MenuItem>
  );
}

/**
 * SubMenuWrapper — expandable submenu item.
 *
 * Shows the parent title with a right-arrow indicator. Clicking toggles
 * visibility of child items below, indented.
 */
/**
 * SubMenuWrapper — shows parent item with `>` indicator. On hover,
 * children appear in a flyout panel to the right.
 */
const SubMenuWrapper: React.FC<{
  item: SubMenuItem;
  onClose: () => void;
  dividerIndex: { value: number };
}> = ({ item, onClose, dividerIndex }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MenuItem
        key={item.key}
        icon={resolveIcon(item.icon)}
        onClick={(e) => e.preventDefault()}
        secondaryContent={<ChevronRightRegular fontSize={14} style={{ opacity: 0.5 }} />}
      >
        {item.title}
      </MenuItem>
      {hovered && (
        <div style={{
          position: 'absolute',
          left: 'calc(100% + 4px)',
          top: 0,
          backgroundColor: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
          padding: '4px 0',
          minWidth: 180,
          zIndex: 10001,
        }}>
          {item.children.map((child) => renderMenuItem(child, onClose, dividerIndex))}
        </div>
      )}
    </div>
  );
};

// ── Polling ───────────────────────────────────────────────────────────────
// ctxMenuConfig is a plain ref ({ value: ... }), not a React state hook.
// We poll at 150ms to detect changes. This avoids modifying the core library
// while keeping the menu responsive (150ms is imperceptible for a right-click).

const POLL_INTERVAL = 150;

/**
 * Renders a Fluent UI context menu driven by the core library's ctxMenuConfig ref.
 *
 * Lifecycle:
 * 1. Poll `ctxMenuConfig.value` every 150ms.
 * 2. On change to `isShow: true`, fetch items from `CtxMenuUtil.GetContextMenu()`.
 * 3. Position the menu at `T3Gv.opt.rClickParam.hitPoint` (right-click coords).
 * 4. On close or item click, hide the menu.
 */
export const T3ContextMenu: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuConfigItem[]>([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastConfig = useRef<ICtxMenuConfig>({ isShow: false, from: '', type: '' });
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position so menu doesn't overflow viewport (direct DOM to avoid render loop)
  useLayoutEffect(() => {
    if (!visible || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${Math.max(0, position.y - rect.height)}px`;
    }
    if (rect.right > window.innerWidth) {
      el.style.left = `${Math.max(0, position.x - rect.width)}px`;
    }
  }, [visible, position, menuItems]);

  // Poll ctxMenuConfig for show/hide signals from the core library.
  useEffect(() => {
    const interval = setInterval(() => {
      const cfg = ctxMenuConfig.value;
      if (!cfg) return;

      // Detect config changes. Always update on isShow=true so position
      // and menu items refresh for every right-click (even on same context).
      const changed =
        cfg.isShow !== lastConfig.current.isShow ||
        cfg.from !== lastConfig.current.from ||
        cfg.type !== lastConfig.current.type;

      if (!changed && !cfg.isShow) return;
      lastConfig.current = { ...cfg };

      if (cfg.isShow) {
        const items = new CtxMenuUtil().GetContextMenu(cfg);
        setMenuItems(items);
        const docPt = T3Gv.opt?.rClickParam?.hitPoint;
        if (docPt && T3Gv.opt?.svgDoc) {
          const winPt = T3Gv.opt.svgDoc.ConvertDocToWindowCoords(docPt.x, docPt.y);
          setPosition({ x: winPt.x, y: winPt.y });
        } else if (docPt) {
          setPosition({ x: docPt.x, y: docPt.y });
        }
        setVisible(true);
      } else {
        setVisible(false);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    // Delay binding to avoid the right-click itself closing the menu
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [visible]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [visible]);

  const handleItemClick = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible || menuItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        backgroundColor: '#fff',
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
        padding: '4px 0',
        minWidth: 200,
        maxWidth: 280,
        overflow: 'visible',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: 13,
        color: '#242424',
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {(() => {
        const di = { value: 0 };
        return menuItems.flatMap((item) => renderMenuItem(item, handleItemClick, di));
      })()}
    </div>
  );
};
