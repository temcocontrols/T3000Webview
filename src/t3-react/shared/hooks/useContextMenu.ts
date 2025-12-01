/**
 * useContextMenu Hook
 *
 * Provides context menu functionality
 * Manages right-click menu state and actions
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  ContextMenuConfig,
  ContextMenuType,
  ContextMenuItem
} from '@t3-react/config/contextMenuConfig';
// TODO: contextMenuConfigs not exported from config file
// import { contextMenuConfigs } from '@t3-react/config/contextMenuConfig';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: ContextMenuType | null;
  data: any;
}

export function useContextMenu() {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    data: null,
  });

  // Show context menu
  const showContextMenu = useCallback(
    (event: React.MouseEvent, type: ContextMenuType, data?: any) => {
      event.preventDefault();
      event.stopPropagation();

      setMenuState({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        type,
        data,
      });
    },
    []
  );

  // Hide context menu
  const hideContextMenu = useCallback(() => {
    setMenuState({
      visible: false,
      x: 0,
      y: 0,
      type: null,
      data: null,
    });
  }, []);

  // Get menu items for current type
  const getMenuItems = useCallback((): ContextMenuItem[] => {
    if (!menuState.type) return [];
    return contextMenuConfigs[menuState.type] || [];
  }, [menuState.type]);

  // Handle menu item click
  const handleMenuItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.action) {
        item.action(menuState.data);
      }
      hideContextMenu();
    },
    [menuState.data, hideContextMenu]
  );

  // Filter visible menu items based on conditions
  const getVisibleMenuItems = useCallback((): ContextMenuItem[] => {
    const items = getMenuItems();
    return items.filter((item) => {
      if (item.visible === undefined) return true;
      if (typeof item.visible === 'function') {
        return item.visible(menuState.data);
      }
      return item.visible;
    });
  }, [getMenuItems, menuState.data]);

  // Filter enabled menu items
  const getEnabledMenuItems = useCallback((): ContextMenuItem[] => {
    const items = getVisibleMenuItems();
    return items.filter((item) => {
      if (item.disabled === undefined) return true;
      if (typeof item.disabled === 'function') {
        return !item.disabled(menuState.data);
      }
      return !item.disabled;
    });
  }, [getVisibleMenuItems, menuState.data]);

  // Close menu on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuState.visible) {
        hideContextMenu();
      }
    };

    if (menuState.visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [menuState.visible, hideContextMenu]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (menuState.visible) {
        hideContextMenu();
      }
    };

    if (menuState.visible) {
      // Delay to avoid immediate close on the same click that opened the menu
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [menuState.visible, hideContextMenu]);

  return {
    // State
    visible: menuState.visible,
    x: menuState.x,
    y: menuState.y,
    type: menuState.type,
    data: menuState.data,

    // Actions
    showContextMenu,
    hideContextMenu,
    handleMenuItemClick,

    // Menu items
    getMenuItems,
    getVisibleMenuItems,
    getEnabledMenuItems,
  };
}
