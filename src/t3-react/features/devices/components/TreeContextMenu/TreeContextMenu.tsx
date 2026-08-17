/**
 * TreeContextMenu Component
 *
 * Context menu for device tree nodes (right-click to open)
 * Maps to C++ DisplayContextMenu
 *
 * C++ Reference (LEFT_PANEL_CPP_DESIGN.md Section 10):
 * - DisplayContextMenu() → TreeContextMenu
 * - Actions: Open, Delete, Edit Label, Copy IP, Ping
 */

import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import {
  Open16Regular,
  Delete16Regular,
  Edit16Regular,
  Copy16Regular,
  Status16Regular,
} from '@fluentui/react-icons';
import type { DeviceInfo } from '../../../../types/device';

/**
 * Context menu props
 */
interface TreeContextMenuProps {
  device: DeviceInfo | null;
  onOpen?: (device: DeviceInfo) => void;
  onDelete?: (device: DeviceInfo) => void;
  onEdit?: (device: DeviceInfo) => void;
  onCopyIP?: (device: DeviceInfo) => void;
  onCheckStatus?: (device: DeviceInfo) => void;
  children: React.ReactElement;
}

/**
 * TreeContextMenu Component
 */
export const TreeContextMenu: React.FC<TreeContextMenuProps> = ({
  device,
  onOpen,
  onDelete,
  onEdit,
  onCopyIP,
  onCheckStatus,
  children,
}) => {
  const [open, setOpen] = useState(false);

  if (!device) {
    return children;
  }

  const handleOpen = () => {
    onOpen?.(device);
    setOpen(false);
  };

  const handleDelete = () => {
    onDelete?.(device);
    setOpen(false);
  };

  const handleEdit = () => {
    onEdit?.(device);
    setOpen(false);
  };

  const handleCopyIP = () => {
    if (device.ipAddress) {
      navigator.clipboard.writeText(device.ipAddress);
    }
    onCopyIP?.(device);
    setOpen(false);
  };

  const handleCheckStatus = () => {
    onCheckStatus?.(device);
    setOpen(false);
  };

  // Handle right-click to open menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <Menu
      open={open}
      onOpenChange={(_e, data) => setOpen(data.open)}
      positioning={{ position: 'after', offset: { mainAxis: -30 } }}
    >
      <MenuTrigger disableButtonEnhancement>
        <div
          onContextMenu={(e) => {
            e.stopPropagation();
            handleContextMenu(e);
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {children}
        </div>
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItem icon={<Open16Regular />} onClick={handleOpen} style={{ fontSize: 12 }}>
            Open Device
          </MenuItem>

          <MenuItem icon={<Edit16Regular />} onClick={handleEdit} style={{ fontSize: 12 }}>
            Edit Label
          </MenuItem>

          {device.ipAddress && (
            <MenuItem icon={<Copy16Regular />} onClick={handleCopyIP} style={{ fontSize: 12 }}>
              Copy IP Address
            </MenuItem>
          )}

          <MenuItem icon={<Status16Regular />} onClick={handleCheckStatus} style={{ fontSize: 12 }}>
            Check Status
          </MenuItem>

          <MenuItem icon={<Delete16Regular />} onClick={handleDelete} style={{ fontSize: 12 }}>
            Delete Device
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

export default TreeContextMenu;
