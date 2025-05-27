

// Define types for menu structure
interface MenuItemBase {
  key: string;
  title: string;
  icon?: any;
  shortcut?: string;
}

interface MenuItem extends MenuItemBase {
  type: 'item';
  onClick?: (key: string) => void;
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

import {
  CloseOutlined,
  EditOutlined,
  CopyOutlined,
  ScissorOutlined,
  FileAddOutlined,
  SettingOutlined,
  DeleteOutlined,
  ClearOutlined,
  RightOutlined,
  RotateRightOutlined,
  CompressOutlined,
  AlignLeftOutlined,
  ApartmentOutlined,
  NodeIndexOutlined,
  SwapOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  UndoOutlined,
  RedoOutlined,
  BlockOutlined,
  SaveOutlined,
  LockOutlined,
  UnlockOutlined,
  BgColorsOutlined,
  CheckOutlined,
  GatewayOutlined,
  RetweetOutlined
} from '@ant-design/icons-vue';
import EvtOpt from '../Event/EvtOpt';

class CtxMenuUtil {

  GetContextMenu() {
    var ctxMenu: MenuConfigItem[] = [];

    ctxMenu.push(...this.Cut());

    return ctxMenu;
  }

  GetContextMenuType(type: string) {
    return "cut";
  }

  Cut() {
    const ctxMenu: MenuConfigItem[] = [
      {
        key: 'cut',
        title: 'Cut',
        icon: ScissorOutlined,
        shortcut: 'Ctrl+X',
        type: 'item',
        onClick: (key) => this.handleSubMenuClick(key)
      }];

    return ctxMenu;
  }

  handleSubMenuClick(key: string, extraData?: any) {
    switch (key) {
      case 'cut':
        // Handle cut action
        // console.log('Cut action triggered');
        EvtOpt.toolOpt.CutAct(event);
        break;
      case 'copy':
        // Handle copy action
        console.log('Copy action triggered');
        break;
      case 'paste':
        // Handle paste action
        console.log('Paste action triggered');
        break;
      case 'delete':
        // Handle delete action
        console.log('Delete action triggered');
        break;
      default:
        console.warn(`Unhandled menu item: ${key}`);
    }
  }
}

export default CtxMenuUtil
