<template>
  <div class="t3-context-menu">
    <a-menu mode="vertical" :theme="theme" :ctxMenuConfig="ctxMenuConfig">
      <template v-for="item in contextMenuItems" :key="item.key">
        <!-- Render divider -->
        <a-menu-divider v-if="item.type === 'divider'" :key="'divider-' + item.key" />

        <!-- Render regular menu item -->
        <a-menu-item v-else-if="item.type === 'item'" :key="'item-' + item.key"
          @click="() => item.onClick && item.onClick(item.key)" :disabled="item.disabled">
          <template #icon v-if="item.icon">
            <component :is="item.icon" />
          </template>
          <span>{{ item.title }}</span>
          <span class="menu-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>

          <!-- Special handling for color picker item -->
          <a-color-picker v-if="item.key === 'bg-color-custom'" v-model:value="selectedColor"
            @change="handleColorChange" style="width: 100%" />
        </a-menu-item>

        <!-- Render submenu -->
        <a-sub-menu v-else-if="item.type === 'submenu'" :key="'submenu-' + item.key">
          <template #icon v-if="item.icon">
            <component :is="item.icon" />
          </template>
          <template #title>{{ item.title }}</template>
          <template #expandIcon v-if="item.expandIcon">
            <component :is="item.expandIcon" class="sub-menu-icon" />
          </template>

          <!-- Render submenu children -->
          <template v-for="child in item.children" :key="child.key">
            <a-menu-divider v-if="child.type === 'divider'" :key="'divider-' + child.key" />
            <a-menu-item v-else :key="'item-' + child.key" @click="() => child.onClick && child.onClick(child.key)"
              :disabled="child.disabled">
              <!-- Special handling for color indicators -->
              <span :class="`color-idic-${child.key.includes('color') ? child.title.substring(1).toLowerCase() : ''}`"
                v-if="child.key.includes('color') && !child.key.includes('custom')"></span>
              <span>{{ child.title }}</span>
              <span class="menu-shortcut" v-if="child.shortcut">{{ child.shortcut }}</span>
            </a-menu-item>
          </template>
        </a-sub-menu>
      </template>
    </a-menu>
  </div>
</template>

<script lang="ts" setup>
import { h, ref, watch } from 'vue';
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
  GatewayOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

import { computed, onMounted, onUnmounted } from 'vue';
import CtxMenuUtil from '@/lib/vue/T3000/Hvac/Doc/CtxMenuUtil'; // Adjust the import path if needed
import LogUtil from '@/lib/vue/T3000/Hvac/Util/LogUtil';
import { ICtxMenuConfig } from '@/lib/vue/T3000/Hvac/Data/Constant/RefConstant';

// Define props with TypeScript
const props = defineProps<{
  ctxMenuConfig?: ICtxMenuConfig;
}>();

// import { ColorPicker } from 'ant-design-vue';

// Color picker state
const selectedColor = ref<string>('#1890ff'); // Default color

// Color change handler
const handleColorChange = (color: string) => {
  console.log('Color changed to:', color);
  message.info(`Background color changed to ${color}`);
  // Here you would update the background color of the selected element
};

// Menu state
const selectedKeys = ref<string[]>([]);
const theme = ref<'light' | 'dark'>('light');

// Menu click handlers
const handleMenuClick = (e: { key: string }) => {
  switch (e.key) {
    case 'item1':
      message.info('Item 1 clicked');
      console.log('Item 1 action executed');
      break;
    case 'item2':
      message.info('Item 2 clicked');
      console.log('Item 2 action executed');
      break;
    case 'item4':
      message.info('Item 4 clicked');
      console.log('Item 4 action executed');
      break;
    default:
      break;
  }
};

// Submenu click handlers
const handleSubMenuClick = (key: string) => {
  message.info(`Submenu ${key} clicked`);
  console.log(`Submenu ${key} action executed`);
};

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

// Menu configuration array
const menuConfig = ref<MenuConfigItem[]>([
  {
    key: 'add-to-library',
    title: 'Add to Library',
    icon: FileAddOutlined,
    shortcut: 'Ctrl+Shift+A',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'load-from-library',
    title: 'Load from Library',
    icon: CopyOutlined,
    shortcut: 'Ctrl+Shift+L',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  { type: 'divider', key: 'divider-1' },
  {
    key: 'bgColorSub',
    title: 'Background Color',
    icon: BgColorsOutlined,
    type: 'submenu',
    expandIcon: RightOutlined,
    children: [
      {
        key: 'bg-color-red',
        title: '#20B2AA',
        shortcut: 'Alt+1',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'bg-color-green',
        title: '#FFFFFF',
        shortcut: 'Alt+2',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'bg-color-blue',
        title: '#0AACB4',
        shortcut: 'Alt+3',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'bg-color-custom',
        title: 'Custom Color...',
        shortcut: 'Alt+C',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      }
    ]
  },
  // Add the rest of your menu items following the same pattern...
]);

// Add to existing script section
// Define a new contexMenuConfig array to match the selected menu items
const contextMenuConfig = ref<MenuConfigItem[]>([
  {
    key: 'cut',
    title: 'Cut',
    icon: ScissorOutlined,
    shortcut: 'Ctrl+X',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'copy',
    title: 'Copy',
    icon: CopyOutlined,
    shortcut: 'Ctrl+C',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'paste',
    title: 'Paste',
    icon: FileAddOutlined,
    shortcut: 'Ctrl+V',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'delete',
    title: 'Delete',
    icon: DeleteOutlined,
    shortcut: 'Del',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  { type: 'divider', key: 'divider-edit-1' },
  {
    key: 'undo',
    title: 'Undo',
    icon: UndoOutlined,
    shortcut: 'Ctrl+Z',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'redo',
    title: 'Redo',
    icon: RedoOutlined,
    shortcut: 'Ctrl+Y',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'duplicate',
    title: 'Duplicate',
    icon: BlockOutlined,
    shortcut: 'Ctrl+D',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'save',
    title: 'Save',
    icon: SaveOutlined,
    shortcut: 'Ctrl+S',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'clear',
    title: 'Clear',
    icon: ClearOutlined,
    shortcut: 'Ctrl+Del',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  { type: 'divider', key: 'divider-edit-2' },
  { type: 'divider', key: 'divider-edit-3' },
  {
    key: 'lock',
    title: 'Lock',
    icon: LockOutlined,
    shortcut: 'Ctrl+L',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'lock-all',
    title: 'Lock All',
    icon: LockOutlined,
    shortcut: 'Ctrl+Shift+L',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'unlock',
    title: 'Unlock',
    icon: UnlockOutlined,
    shortcut: 'Ctrl+U',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  { type: 'divider', key: 'divider-edit-4' },
  {
    key: 'select-all',
    title: 'Select All',
    icon: CheckOutlined,
    shortcut: 'Ctrl+A',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'select-shape',
    title: 'Select Shape(s)',
    icon: GatewayOutlined,
    shortcut: 'Alt+S',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  { type: 'divider', key: 'divider-edit-5' },
  {
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
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'flip-vertical',
        title: 'Flip Vertical',
        shortcut: 'Alt+2',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      }
    ]
  },
  {
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
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'make-same-height',
        title: 'Same Height',
        shortcut: 'Alt+H',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'make-both-same',
        title: 'Same Both',
        shortcut: 'Alt+B',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      }
    ]
  },
  {
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
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'rotate-45',
        title: '45°',
        shortcut: 'Alt+R,1',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'rotate-90',
        title: '90°',
        shortcut: 'Alt+R,2',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'rotate-135',
        title: '135°',
        shortcut: 'Alt+R,3',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'rotate-180',
        title: '180°',
        shortcut: 'Alt+R,4',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'rotate-225',
        title: '225°',
        shortcut: 'Alt+R,5',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'rotate-270',
        title: '270°',
        shortcut: 'Alt+R,6',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'rotate-360',
        title: '360°',
        shortcut: 'Alt+R,7',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      }
    ]
  },
  {
    key: 'align',
    title: 'Align',
    icon: AlignLeftOutlined,
    type: 'submenu',
    expandIcon: RightOutlined,
    children: [
      {
        key: 'align-left',
        title: 'Align Left',
        shortcut: 'Alt+L',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'align-center',
        title: 'Align Center',
        shortcut: 'Alt+C',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'align-right',
        title: 'Align Right',
        shortcut: 'Alt+R',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'align-top',
        title: 'Align Top',
        shortcut: 'Alt+T',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'align-middle',
        title: 'Align Middle',
        shortcut: 'Alt+M',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      },
      {
        key: 'align-bottom',
        title: 'Align Bottom',
        shortcut: 'Alt+B',
        type: 'item',
        onClick: (key) => handleSubMenuClick(key)
      }
    ]
  },
  { type: 'divider', key: 'divider-edit-6' },
  {
    key: 'group',
    title: 'Group',
    icon: ApartmentOutlined,
    shortcut: 'Ctrl+G',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'ungroup',
    title: 'Ungroup',
    icon: NodeIndexOutlined,
    shortcut: 'Ctrl+Shift+G',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  { type: 'divider', key: 'divider-edit-7' },
  {
    key: 'bring-to-front',
    title: 'Bring to Front',
    icon: VerticalAlignTopOutlined,
    shortcut: 'Shift+PgUp',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  },
  {
    key: 'send-to-back',
    title: 'Send to Back',
    icon: VerticalAlignBottomOutlined,
    shortcut: 'Shift+PgDn',
    type: 'item',
    onClick: (key) => handleSubMenuClick(key)
  }
]);

// You can merge this with your existing menuConfig or replace it
// Example:
// const fullMenuConfig = ref<MenuConfigItem[]>([...menuConfig.value, ...contextMenuConfig.value]);

// Function to render menu items based on configuration
const renderMenuItem = (item: MenuConfigItem) => {
  if (item.type === 'divider') {
    return h('a-menu-divider', { key: item.key });
  } else if (item.type === 'item') {
    const menuItem = item as MenuItem;
    return h('a-menu-item',
      {
        key: menuItem.key,
        onClick: () => menuItem.onClick?.(menuItem.key)
      },
      {
        icon: menuItem.icon ? () => h(menuItem.icon) : undefined,
        default: () => [
          h('span', {}, menuItem.title),
          menuItem.shortcut ? h('span', { class: 'menu-shortcut' }, menuItem.shortcut) : null
        ]
      }
    );
  } else if (item.type === 'submenu') {
    const subMenu = item as SubMenuItem;
    return h('a-sub-menu',
      { key: subMenu.key },
      {
        icon: subMenu.icon ? () => h(subMenu.icon) : undefined,
        title: () => h('span', {}, subMenu.title),
        expandIcon: subMenu.expandIcon ? () => h(subMenu.expandIcon, { class: 'sub-menu-icon' }) : undefined,
        default: () => subMenu.children.map(child => renderMenuItem(child))
      }
    );
  }
};

// Context menu state
const contextMenuItems = ref(null);

// Lifecycle hooks
onMounted(() => {
  // Get the context menu when component is mounted
  contextMenuItems.value = new CtxMenuUtil().GetContextMenu(props.ctxMenuConfig);
  LogUtil.Debug('= v.T3ContextMenu.vue: onMounted/ Context menu initialized ,props.ctxMenuConfig', props.ctxMenuConfig);
});

// Watch for changes to ctxMenuConfig prop
watch(
  () => props.ctxMenuConfig,
  (newConfig) => {
    if (newConfig) {
      // Update the context menu items when config changes
      contextMenuItems.value = new CtxMenuUtil().GetContextMenu(newConfig);
      LogUtil.Debug('= v.T3ContextMenu.vue: watch/ Context menu updated with new config', newConfig);
    }
  },
  { deep: true } // Watch deeply to detect changes in nested properties
);

onUnmounted(() => {
  // Dispose of the context menu when component is unmounted
  if (contextMenuItems.value) {
    // Check if the contextMenu has a dispose method
    if (typeof contextMenuItems.value.dispose === 'function') {
      contextMenuItems.value.dispose();
    }
    // Set to null to help with garbage collection
    contextMenuItems.value = null;
    LogUtil.Debug('Context menu disposed');
  }
});

</script>

<style scoped>
.t3-context-menu {
  /* width: 256px; */
}

.menu-shortcut {
  float: right;
  color: #999;
  font-size: 10px;
  margin-left: 10px;
  margin-top: 5px;
}

/* .has-sub-menu {
  padding-inline-end: 0px;
} */

.sub-menu-icon {
  float: right;
  margin-top: 5px;
}

.color-idic-20b2aa {
  background-color: #20B2AA;
  width: 16px;
  height: 16px;
  display: inline-block;
  margin-right: 8px;
}


.color-idic-ffffff {
  background-color: #FFFFFF;
  width: 16px;
  height: 16px;
  display: inline-block;
  margin-right: 8px;
}


.color-idic-0aacb4 {
  background-color: #0AACB4;
  width: 16px;
  height: 16px;
  display: inline-block;
  margin-right: 8px;
}

:deep(.ant-menu-submenu-title) {
  display: flex;
  align-items: center;
}

:deep(.ant-menu-item) {
  display: flex;
  align-items: center;
}
</style>
