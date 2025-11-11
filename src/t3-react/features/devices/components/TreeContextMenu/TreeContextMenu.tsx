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
  Open20Regular,
  Delete20Regular,
  Edit20Regular,
  Copy20Regular,
  WifiSettings20Regular,
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
    <>
      <div
        onContextMenu={handleContextMenu}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </div>

      <Menu
        open={open}
        onOpenChange={(_e, data) => setOpen(data.open)}
      >
        <MenuTrigger disableButtonEnhancement>
          <div style={{ display: 'none' }} />
        </MenuTrigger>

        <MenuPopover>
          <MenuList>
            <MenuItem icon={<Open20Regular />} onClick={handleOpen}>
              Open Device
            </MenuItem>

            <MenuItem icon={<Edit20Regular />} onClick={handleEdit}>
              Edit Label
            </MenuItem>

            {device.ipAddress && (
              <MenuItem icon={<Copy20Regular />} onClick={handleCopyIP}>
                Copy IP Address
              </MenuItem>
            )}

            <MenuItem icon={<WifiSettings20Regular />} onClick={handleCheckStatus}>
              Check Status
            </MenuItem>

            <MenuItem icon={<Delete20Regular />} onClick={handleDelete}>
              Delete Device
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    </>
  );
};

export default TreeContextMenu;
