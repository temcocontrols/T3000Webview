

// Define types for menu structure
interface MenuItemBase {
  key: string;
  title: string;
  icon?: any;
  shortcut?: string;
  disabled?: boolean;
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
  RetweetOutlined,
  SelectOutlined,
  BorderOutlined
} from '@ant-design/icons-vue';
import EvtOpt from '../Event/EvtOpt';
import { ctxMenuConfig, ICtxMenuConfig } from '../Data/Constant/RefConstant';
import LogUtil from '../Util/LogUtil';
import T3Gv from '../Data/T3Gv';
import DataOpt from '../Opt/Data/DataOpt';
import ObjectUtil from '../Opt/Data/ObjectUtil';
import SelectUtil from '../Opt/Opt/SelectUtil';
import { IOptData } from '../Data/T3Type';
import NvConstant from '../Data/Constant/NvConstant';
import T3Opt from './T3Opt';
import Hvac from '../Hvac';
import ToolOpt from '../Opt/Tool/ToolOpt';

class CtxMenuUtil {

  private ctxConfig: ICtxMenuConfig;
  private checkData: IOptData;

  /*
  constructor(ctxConfig: ICtxMenuConfig) {
    LogUtil.Debug('= u.CtxMenuUtil: constructor/ ctxConfig=', { isShow: ctxConfig.isShow, from: ctxConfig.from, type: ctxConfig.type });
    this.ctxConfig = ctxConfig;
  }
  */

  GetContextMenu(ctxConfig: ICtxMenuConfig): MenuConfigItem[] {
    LogUtil.Debug('= u.CtxMenuUtil: GetContextMenu/ ctxConfig=', { isShow: ctxConfig.isShow, from: ctxConfig.from, type: ctxConfig.type });
    this.ctxConfig = ctxConfig;

    // const ctxMenuType = this.GetContextMenuType();
    const ctxMenuType = this.ctxConfig.from;
    const checkData = this.PrepareOptCheckData();
    this.checkData = checkData;

    var ctxMenu: MenuConfigItem[] = [];

    /*
    if (ctxMenuType == "WorkArea") {
      // ctxMenu = this.GetWorkAreaDefaultMenu();
      ctxMenu = this.GetFullContextMenu();
    }
    else if (ctxMenuType == "Multi-Select") {
      ctxMenu = this.GetMultiSelectMenu();
    }
    else if (ctxMenuType == "Single-Select") {
      ctxMenu = this.GetSingleSelectMenu();
    }
    else {
      LogUtil.Error('= u.CtxMenuUtil: GetContextMenu/ Unknown context menu type:', ctxMenuType);
      return [];
    }
    */

    ctxMenu = this.GetFullContextMenu();
    LogUtil.Debug('= u.CtxMenuUtil: GetContextMenu/ ctxMenu=', ctxMenu);

    return ctxMenu;
  }

  /*
  GetContextMenuType() {
    if (this.ctxConfig.from == "WorkArea") {
      return "WorkArea";
    }
    else {
      // const selectedList = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);
      // const selectObjs = SelectUtil.GetSelectedObject();
      // LogUtil.Debug('= u.CtxMenuUtil: GetContextMenuType/ selectObjs=', selectObjs, "selectedList=", selectedList);
      return "Shape";
    }
  }
  */

  GetFullContextMenu() {
    const ctxMenu: MenuConfigItem[] = [

      /*
      ...this.Select(),
      ...this.SelectAll(),
      ...this.SelectShape(),
      ...this.BackgroundColor(),
      ...this.Divider(),
      */
      ...this.SelectSection(),

      ...this.UndoRedoSection(),

      /*
      ...this.Rotate(),
      ...this.Alignment(),
      ...this.Flip(),
      ...this.MakeSame(),
      ...this.BringToFront(),
      ...this.SendToBack(),
      ...this.Divider(),
      */
      ...this.ShapeCommonOptSection(),

      /*
      ...this.Group(),
      ...this.Ungroup(),
      ...this.Divider(),
      */
      ...this.GroupSection(),

      /*
      ...this.Cut(),
      ...this.Copy(),
      ...this.Paste(),
      ...this.Duplicate(),
      ...this.Divider(),
      */
      ...this.CutCopySection(),

      /*
      ...this.Delete(),
      ...this.Reset(),
      ...this.Save(),
      ...this.Divider(),
      */
      ...this.SaveSection(),

      /*
      ...this.AddToLibrary(),
      ...this.LoadFromLibrary(),
      ...this.Divider(),
      */
      ...this.LibrarySection(),

      /*
      ...this.LockAll(),
      ...this.Unlock(),
      */
      ...this.LockSection(),
    ];

    return ctxMenu;
  }

  SelectSection() {
    const ctxItems: MenuConfigItem[] = [];

    ctxItems.push(...this.Select());
    ctxItems.push(...this.SelectAll());
    ctxItems.push(...this.SelectShape());
    ctxItems.push(...this.BackgroundColor());

    if (ctxItems.length > 0) {
      ctxItems.push(...this.Divider());
    }

    return ctxItems;
  }

  UndoRedoSection() {
    const ctxItems: MenuConfigItem[] = [];
    ctxItems.push(...this.Undo());
    ctxItems.push(...this.Redo());
    if (ctxItems.length > 0) {
      ctxItems.push(...this.Divider());
    }
    return ctxItems;
  }

  ShapeCommonOptSection() {
    const selected = this.HasSelection();
    const ctxItems: MenuConfigItem[] = [];

    if (selected) {
      ctxItems.push(...this.Rotate());
      ctxItems.push(...this.Alignment());
      ctxItems.push(...this.Flip());
      ctxItems.push(...this.MakeSame());
      ctxItems.push(...this.BringToFront());
      ctxItems.push(...this.SendToBack());
    }

    if (ctxItems.length > 0) {
      ctxItems.push(...this.Divider());
    }

    return ctxItems;
  }

  GroupSection() {
    const canGroup = this.CanGroup();
    const ctxItems: MenuConfigItem[] = [];

    if (canGroup) {
      ctxItems.push(...this.Group());
    }

    if (ctxItems.length > 0) {
      ctxItems.push(...this.Divider());
    }

    return ctxItems;
  }

  CutCopySection() {
    const selected = this.HasSelection();
    const hasClipboard = this.HasClipboardData();

    const ctxItems: MenuConfigItem[] = [];

    if (selected) {
      ctxItems.push(...this.Cut());
      ctxItems.push(...this.Copy());
      ctxItems.push(...this.Duplicate());
    }

    if (hasClipboard) {
      ctxItems.push(...this.Paste());
    }

    if (ctxItems.length > 0) {
      ctxItems.push(...this.Divider());
    }

    return ctxItems;
  }

  SaveSection() {
    const selected = this.HasSelection();
    const ctxItems: MenuConfigItem[] = [];

    if (selected) {
      ctxItems.push(...this.Delete());
    }

    ctxItems.push(...this.Save());
    ctxItems.push(...this.Reset());

    if (ctxItems.length > 0) {
      ctxItems.push(...this.Divider());
    }

    return ctxItems;
  }

  LibrarySection() {
    const selected = this.HasSelection();
    const ctxItems: MenuConfigItem[] = [];

    if (selected) {
      ctxItems.push(...this.AddToLibrary());
    }

    ctxItems.push(...this.LoadFromLibrary());

    if (ctxItems.length > 0) {
      ctxItems.push(...this.Divider());
    }

    return ctxItems;
  }

  LockSection() {
    const selected = this.HasSelection();
    const canLock = this.CanLock();
    const canUnlock = this.CanUnlock();
    const canAllUnlock = this.CanAllUnlock();

    const ctxItems: MenuConfigItem[] = [];

    if (selected) {
      if (canLock) {
        ctxItems.push(...this.Lock());
      }

      if (canUnlock) {
        ctxItems.push(...this.Unlock());
      }
    }

    // For draw area context menu, always show Lock All option
    if (!selected) {
      if (canAllUnlock) {
        ctxItems.push(...this.LockAll());
      }
    }

    if (ctxItems.length > 0) {
      ctxItems.push(...this.Divider());
    }

    return ctxItems;
  }

  GetWorkAreaDefaultMenu() {
    const ctxMenu: MenuConfigItem[] = [
      ...this.Select(),
      ...this.SelectAll(),
      ...this.SelectShape(),
      ...this.Divider(),

      ...this.Cut(),
      ...this.Copy(),
      ...this.Paste(),
      ...this.Divider(),

      ...this.Undo(),
      ...this.Redo(),
      ...this.Divider(),

      ...this.Delete(),
      ...this.Save(),
      ...this.Reset(),
      ...this.Divider(),

      ...this.BackgroundColor(),
      ...this.AddToLibrary(),
      ...this.LoadFromLibrary(),
      ...this.Divider(),

      ...this.Duplicate(),
      ...this.Divider(),

      ...this.LockAll(),
      ...this.Unlock(),
      ...this.Divider()
    ];

    return ctxMenu;
  }

  GetMultiSelectMenu() {
    const ctxMenu: MenuConfigItem[] = [
      ...this.Cut(),
      ...this.Copy(),
      ...this.Paste(),
      ...this.Delete(),
      ...this.Divider(),
      ...this.Undo(),
      ...this.Redo(),
      ...this.Duplicate(),
      ...this.Divider(),
      ...this.Save(),
      ...this.Divider(),
      ...this.LockAll(),
      ...this.Unlock(),
      ...this.Divider(),
      ...this.SelectAll()
    ];

    return ctxMenu;
  }

  GetSingleSelectMenu() {
    const ctxMenu: MenuConfigItem[] = [
      ...this.Cut(),
      ...this.Copy(),
      ...this.Paste(),
      ...this.Delete(),
      ...this.Divider(),
      ...this.Undo(),
      ...this.Redo(),
      ...this.Duplicate(),
      ...this.Divider(),
      ...this.Save(),
      ...this.Divider(),
      ...this.Lock(),
      ...this.Unlock(),
      ...this.Divider(),
      ...this.SelectShape(),
      ...this.Divider(),
      ...this.Flip(),
      ...this.MakeSame(),
      ...this.Divider(),
      ...this.Rotate(),
      ...this.Divider(),
      ...this.Alignment(),
      ...this.Divider(),
      ...this.Group(),
      ...this.Ungroup(),
      ...this.Divider(),
      ...this.BringToFront(),
      ...this.SendToBack()
    ];
    return ctxMenu;
  }

  Divider() {
    const ctxMenu: MenuConfigItem[] =
      [{
        type: 'divider',
        key: 'divider'
      }];

    return ctxMenu;
  }

  AddToLibrary() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'add-to-library',
        title: 'Add to Library',
        icon: FileAddOutlined,
        shortcut: 'Ctrl+Shift+A',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  LoadFromLibrary() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'load-from-library',
        title: 'Load from Library',
        icon: CopyOutlined,
        shortcut: 'Ctrl+Shift+L',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  BackgroundColor() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'background-color',
        title: 'Background Color',
        icon: BgColorsOutlined,
        type: 'submenu',
        expandIcon: RightOutlined,
        children: [
          {
            key: 'bg-color-20B2AA',
            title: '#20B2AA',
            // shortcut: 'Alt+1',
            shortcut: '',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'bg-color-FFFFFF',
            title: '#FFFFFF',
            // shortcut: 'Alt+2',
            shortcut: '',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'bg-color-0AACB4',
            title: '#0AACB4',
            // shortcut: 'Alt+3',
            shortcut: '',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'bg-color-custom',
            title: 'Custom Color...',
            // shortcut: 'Alt+C',
            shortcut: '',
            type: 'item',
            disabled: true,
            onClick: (key) => this.HandleMenuClick(key)
          }
        ]
      }];
    return ctxMenu;
  }

  Cut() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'cut',
        title: 'Cut',
        icon: ScissorOutlined,
        shortcut: 'Ctrl+X',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Copy() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'copy',
        title: 'Copy',
        icon: CopyOutlined,
        shortcut: 'Ctrl+C',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Paste() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'paste',
        title: 'Paste',
        icon: FileAddOutlined,
        shortcut: 'Ctrl+V',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Delete() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'delete',
        title: 'Delete',
        icon: DeleteOutlined,
        shortcut: 'Del',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Undo() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'undo',
        title: 'Undo',
        icon: UndoOutlined,
        shortcut: 'Ctrl+Z',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Redo() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'redo',
        title: 'Redo',
        icon: RedoOutlined,
        shortcut: 'Ctrl+B',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Duplicate() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'duplicate',
        title: 'Duplicate',
        icon: BlockOutlined,
        shortcut: 'Ctrl+D',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Save() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'save',
        title: 'Save',
        icon: SaveOutlined,
        shortcut: 'Ctrl+S',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Reset() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'reset',
        title: 'Reset',
        icon: ClearOutlined,
        // shortcut: 'Ctrl+R',
        shortcut: '',//Todo: conflict with old version, pending on new ui online
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Lock() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'lock',
        title: 'Lock',
        icon: LockOutlined,
        shortcut: 'Ctrl+L',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  LockAll() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'lock-all',
        title: 'Lock All',
        icon: LockOutlined,
        shortcut: 'Ctrl+Shift+L',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Unlock() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'unlock',
        title: 'Unlock',
        icon: UnlockOutlined,
        shortcut: 'Ctrl+U',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Select() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'select',
        title: 'Select',
        icon: SelectOutlined,
        // shortcut: 'Ctrl+A',
        shortcut: '',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  SelectAll() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'select-all',
        title: 'Select All',
        icon: CheckOutlined,
        shortcut: 'Ctrl+A',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  SelectShape() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'select-shape',
        title: 'Select Shape',
        icon: BorderOutlined,
        // shortcut: 'Alt+S',
        type: 'submenu',
        expandIcon: RightOutlined,
        children: [
          {
            key: 'sl-rectangle',
            title: 'Rectangle',
            // shortcut: 'Alt+1',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'sl-circle',
            title: 'Circle',
            // shortcut: 'Alt+2',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'sl-duct-1',
            title: 'Duct 1',
            // shortcut: 'Alt+1',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'sl-duct-2',
            title: 'Duct 2',
            // shortcut: 'Alt+1',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'sl-duct-3',
            title: 'Duct 3',
            // shortcut: 'Alt+1',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'sl-pipe-1',
            title: 'Pipe 1',
            // shortcut: 'Alt+2',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          }
        ]
      }];

    return ctxMenu;
  }

  Flip() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'flip',
        title: 'Flip',
        icon: SwapOutlined,
        type: 'submenu',
        expandIcon: RightOutlined,
        children: [
          {
            key: 'flip-horizontal',
            title: 'Flip Horization',
            shortcut: 'Alt+1',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'flip-vertical',
            title: 'Flip Vertical',
            shortcut: 'Alt+2',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          }
        ]
      }];

    return ctxMenu;
  }

  MakeSame() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'make-same',
        title: 'Make Same',
        icon: CompressOutlined,
        type: 'submenu',
        expandIcon: RightOutlined,
        children: [
          {
            key: 'make-same-width',
            title: 'Same Width',
            shortcut: 'Alt+W',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'make-same-height',
            title: 'Same Height',
            shortcut: 'Alt+H',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'make-same-both',
            title: 'Same Both',
            shortcut: 'Alt+B',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          }
        ]
      }];

    return ctxMenu;
  }

  Rotate() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'rotate',
        title: 'Rotate',
        icon: RotateRightOutlined,
        type: 'submenu',
        expandIcon: RightOutlined,
        children: [
          {
            key: 'rotate-0',
            title: '0°',
            shortcut: 'Alt+R,0',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'rotate-45',
            title: '45°',
            shortcut: 'Alt+R,1',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'rotate-90',
            title: '90°',
            shortcut: 'Alt+R,2',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'rotate-135',
            title: '135°',
            shortcut: 'Alt+R,3',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'rotate-180',
            title: '180°',
            shortcut: 'Alt+R,4',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'rotate-225',
            title: '225°',
            shortcut: 'Alt+R,5',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'rotate-270',
            title: '270°',
            shortcut: 'Alt+R,6',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'rotate-360',
            title: '360°',
            shortcut: 'Alt+R,7',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          }
        ]
      }];

    return ctxMenu;
  }

  Alignment() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'alignment',
        title: 'Alignment',
        icon: AlignLeftOutlined,
        type: 'submenu',
        expandIcon: RightOutlined,
        children: [
          {
            key: 'align-left',
            title: 'Align Left',
            shortcut: 'Alt+L',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'align-center',
            title: 'Align Center',
            shortcut: 'Alt+C',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'align-right',
            title: 'Align Right',
            shortcut: 'Alt+R',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'align-top',
            title: 'Align Top',
            shortcut: 'Alt+T',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'align-middle',
            title: 'Align Middle',
            shortcut: 'Alt+M',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          },
          {
            key: 'align-bottom',
            title: 'Align Bottom',
            shortcut: 'Alt+B',
            type: 'item',
            onClick: (key) => this.HandleMenuClick(key)
          }
        ]
      }];

    return ctxMenu;
  }

  Group() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'group',
        title: 'Group',
        icon: ApartmentOutlined,
        shortcut: 'Ctrl+G',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  Ungroup() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'ungroup',
        title: 'Ungroup',
        icon: NodeIndexOutlined,
        shortcut: 'Ctrl+Shift+G',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  BringToFront() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'bring-to-front',
        title: 'Bring to Front',
        icon: VerticalAlignTopOutlined,
        shortcut: 'Shift+PgUp',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  SendToBack() {
    const ctxMenu: MenuConfigItem[] =
      [{
        key: 'send-to-back',
        title: 'Send to Back',
        icon: VerticalAlignBottomOutlined,
        shortcut: 'Shift+PgDn',
        type: 'item',
        onClick: (key) => this.HandleMenuClick(key)
      }];

    return ctxMenu;
  }

  HandleMenuClick(key: string, extraData?: any) {
    switch (key) {
      case 'add-to-library':
        EvtOpt.toolOpt.AddToLibraryAct();
        break;
      case 'load-from-library':
        EvtOpt.toolOpt.LoadLibraryAct();
        break;
      case 'bg-color-20B2AA':
        EvtOpt.toolOpt.LibSetBackgroundColorAct('#20B2AA');
        break;
      case 'bg-color-FFFFFF':
        EvtOpt.toolOpt.LibSetBackgroundColorAct('#FFFFFF');
        break;
      case 'bg-color-0AACB4':
        EvtOpt.toolOpt.LibSetBackgroundColorAct('#0AACB4');
        break;
      case 'bg-color-custom':
        // This action is intended to open a color picker for custom background color
        // Currently, it will call the same set background color action with white color
        // This is a placeholder for future implementation
        // Note: The custom color picker is not implemented separately
        EvtOpt.toolOpt.LibSetBackgroundColorAct('#FFFFFF');
        break;
      case 'cut':
        EvtOpt.toolOpt.CutAct(event);
        break;
      case 'copy':
        EvtOpt.toolOpt.CopyAct(event);
        break;
      case 'paste':
        EvtOpt.toolOpt.PasteAct(event);
        break;
      case 'delete':
        EvtOpt.toolOpt.DeleteAct(event);
        break;
      case 'undo':
        EvtOpt.toolOpt.UndoAct(event);
        break;
      case 'redo':
        EvtOpt.toolOpt.RedoAct(event);
        break;
      case 'duplicate':
        EvtOpt.toolOpt.DuplicateAct(event);
        break;
      case 'save':
        EvtOpt.toolOpt.SaveAct();
        break;
      case 'reset':
        DataOpt.ClearT3LocalStorage();
        Hvac.UI.Reload();
        break;
      case 'lock':
        EvtOpt.toolOpt.LibLockAct(event);
        break;
      case 'lock-all':
        // This action is intended to lock all items in the library
        // Currently, it will call the same lock action
        // This is a placeholder for future implementation
        // Note: The 'lock-all' action is not implemented separately
        EvtOpt.toolOpt.LibLockAct(event);
        break;
      case 'unlock':
        EvtOpt.toolOpt.LibUnlockAct(event);
        break;
      case 'select':
        EvtOpt.toolOpt.SelectAct(event);
        break;
      case 'select-all':
        EvtOpt.toolOpt.tul.SelectAllObjects();
        break;
      case 'select-shape':
        // This action is intended to select a specific shape
        // Currently, it will call the same select action
        // This is a placeholder for future implementation
        EvtOpt.toolOpt.SelectAct(event);
        break;
      case 'flip-horizontal':
        EvtOpt.toolOpt.ShapeFlipHorizontalAct(event);
        break;
      case 'flip-vertical':
        EvtOpt.toolOpt.ShapeFlipVerticalAct(event);
        break;
      case 'make-same-width':
        EvtOpt.toolOpt.MakeSameSizeAct(event, 2);
        break;
      case 'make-same-height':
        EvtOpt.toolOpt.MakeSameSizeAct(event, 1);
        break;
      case 'make-same-both':
        EvtOpt.toolOpt.MakeSameSizeAct(event, 3);
        break;
      case 'rotate-0':
        EvtOpt.toolOpt.RotateAct(event, 0);
        break;
      case 'rotate-45':
        EvtOpt.toolOpt.RotateAct(event, 45);
        break;
      case 'rotate-90':
        EvtOpt.toolOpt.RotateAct(event, 90);
        break;
      case 'rotate-135':
        EvtOpt.toolOpt.RotateAct(event, 135);
        break;
      case 'rotate-180':
        EvtOpt.toolOpt.RotateAct(event, 180);
        break;
      case 'rotate-225':
        EvtOpt.toolOpt.RotateAct(event, 225);
        break;
      case 'rotate-270':
        EvtOpt.toolOpt.RotateAct(event, 270);
        break;
      case 'rotate-360':
        EvtOpt.toolOpt.RotateAct(event, 360);
        break;
      case 'align-left':
        EvtOpt.toolOpt.ShapeAlignAct("lefts");
        break;
      case 'align-center':
        EvtOpt.toolOpt.ShapeAlignAct("centers");
        break;
      case 'align-right':
        EvtOpt.toolOpt.ShapeAlignAct("rights");
        break;
      case 'align-top':
        EvtOpt.toolOpt.ShapeAlignAct("tops");
        break;
      case 'align-middle':
        EvtOpt.toolOpt.ShapeAlignAct("middles");
        break;
      case 'align-bottom':
        EvtOpt.toolOpt.ShapeAlignAct("bottoms");
        break;
      case 'group':
        EvtOpt.toolOpt.GroupAct(event);
        break;
      case 'ungroup':
        EvtOpt.toolOpt.UnGroupAct(event);
        break;
      case 'bring-to-front':
        EvtOpt.toolOpt.ShapeBringToFrontAct(event);
        break;
      case 'send-to-back':
        EvtOpt.toolOpt.ShapeSendToBackAct(event);
        break;
      case 'zoom-in':
        T3Gv.docUtil.ZoomIn();
        break;
      case 'zoom-out':
        T3Gv.docUtil.ZoomOut();
        break;
    }

    ctxMenuConfig.value.isShow = false;
  }

  CanGroup() {
    return this.checkData.selectedList &&
      this.checkData.selectedList.length > 1 &&
      this.checkData.selectedList.every(item => item && item !== -1);
  }

  HasSelection() {
    return this.checkData.selectedList && this.checkData.selectedList.length > 0 &&
      this.checkData.selectedList.every(item => item && item !== -1);
  }

  HasClipboardData() {
    return !!this.checkData.clipboardData;
  }

  CanLock() {
    // First check if there are any selected objects
    if (!this.checkData.selectedList || this.checkData.selectedList.length === 0) {
      return false;
    }

    // Check if at least one selected object doesn't have the lock flag
    const lockFlag = NvConstant.ObjFlags.Lock;

    // Return true if at least one object doesn't have the lock flag (can be locked)
    return this.checkData.selectObjs.some(obj => {
      return obj && (obj.flags & lockFlag) === 0;
    });
  }

  CanUnlock() {
    // First check if there are any selected objects
    if (!this.checkData.selectedList || this.checkData.selectedList.length === 0) {
      return false;
    }

    // Check if at least one selected object has the lock flag
    const lockFlag = NvConstant.ObjFlags.Lock;

    // Return true if at least one object has the lock flag (can be unlocked)
    return this.checkData.selectObjs.some(obj => {
      return obj && (obj.flags & lockFlag) !== 0;
    });
  }

  CanAllUnlock() {
    // Check if there are any objects with lock flag in T3Gv.stdObj
    const lockFlag = NvConstant.ObjFlags.Lock;

    // If T3Gv.stdObj doesn't exist or is empty, return false
    if (!T3Gv.stdObj || Object.keys(T3Gv.stdObj).length === 0) {
      return false;
    }

    // Return true if at least one object has the lock flag
    // Return true if at least one object in T3Gv.stdObj has the lock flag
    return Object.values(T3Gv.stdObj).some(obj => {
      return obj && (obj.flags & lockFlag) !== 0;
    });
  }

  PrepareOptCheckData(): IOptData {
    const selected = SelectUtil.GetSelectedObjectList();
    const clipboardData = T3Gv.opt.header.ClipboardBuffer;

    const clipboardPreview = clipboardData ? (typeof clipboardData === 'string' ? clipboardData.substring(0, 30) : clipboardData) : null;

    const checkData: IOptData = {
      selectedList: selected.selectedList || [],
      selectObjs: selected?.selectedObjects || [],
      clipboardData: clipboardData
    };

    LogUtil.Debug('= u.CtxMenuUtil: PrepareOptCheckData/ selected=', selected, "checkData=", checkData);

    return checkData;
  }
}

export default CtxMenuUtil
