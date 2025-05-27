<template>
  <div class="t3-context-menu">
    <a-menu v-model:selectedKeys="selectedKeys" mode="vertical" :theme="theme" @click="handleMenuClick">

      <!-- <a-menu-divider /> -->

      <a-menu-item key="add-to-library" @click="handleSubMenuClick('add-to-library')">
        <template #icon>
          <FileAddOutlined />
        </template>
        <span>Add to Library</span>
        <span class="menu-shortcut">Ctrl+Shift+A</span>
      </a-menu-item>

      <a-menu-item key="load-from-library" @click="handleSubMenuClick('load-from-library')">
        <template #icon>
          <CopyOutlined />
        </template>
        <span>Load from Library</span>
        <span class="menu-shortcut">Ctrl+Shift+L</span>
      </a-menu-item>


      <a-menu-divider />

      <a-sub-menu key="bgColorSub">
        <template #icon>
          <BgColorsOutlined />
        </template>
        <template #title>Background Color</template>
        <template #expandIcon>
          <right-outlined class="sub-menu-icon" />
        </template>
        <a-menu-item key="bg-color-red" @click="handleSubMenuClick('bg-color-red')">
          <span class="color-idic-20b2aa"></span>
          <span>#20B2AA</span>
          <span class="menu-shortcut">Alt+1</span>
        </a-menu-item>
        <a-menu-item key="bg-color-green" @click="handleSubMenuClick('bg-color-green')">
          <span class="color-idic-ffffff"></span>
          <span>#FFFFFF</span>
          <span class="menu-shortcut">Alt+2</span>
        </a-menu-item>
        <a-menu-item key="bg-color-blue" @click="handleSubMenuClick('bg-color-blue')">
          <span class="color-idic-0aacb4"></span>
          <span>#0AACB4</span>
          <span class="menu-shortcut">Alt+3</span>
        </a-menu-item>
        <a-menu-item key="bg-color-custom" @click="handleSubMenuClick('bg-color-custom')">
          <span>Custom Color...</span>
          <span class="menu-shortcut">Alt+C</span>
          <a-color-picker v-model:value="selectedColor" @change="handleColorChange" style="width: 100%" />
        </a-menu-item>

      </a-sub-menu>
      <a-menu-divider />

      <a-menu-item key="item1">
        <template #icon>
          <ScissorOutlined />
        </template>
        <span>Cut</span>
        <span class="menu-shortcut">Ctrl+X</span>
      </a-menu-item>

      <a-menu-item key="item2">
        <template #icon>
          <CopyOutlined />
        </template>
        <span>Copy</span>
        <span class="menu-shortcut">Ctrl+C</span>
      </a-menu-item>

      <a-menu-item key="item2">
        <template #icon>
          <FileAddOutlined />
        </template>
        <span>Paste</span>
        <span class="menu-shortcut">Ctrl+V</span>
      </a-menu-item>

      <a-menu-item key="delete" @click="handleSubMenuClick('delete')">
        <template #icon>
          <delete-outlined />
        </template>
        <span>Delete</span>
        <span class="menu-shortcut">Del</span>
      </a-menu-item>

      <a-menu-divider />

      <a-menu-item key="undo" @click="handleSubMenuClick('undo')">
        <template #icon>
          <UndoOutlined />
        </template>
        <span>Undo</span>
        <span class="menu-shortcut">Ctrl+Z</span>
      </a-menu-item>

      <a-menu-item key="redo" @click="handleSubMenuClick('redo')">
        <template #icon>
          <RedoOutlined />
        </template>
        <span>Redo</span>
        <span class="menu-shortcut">Ctrl+Y</span>
      </a-menu-item>

      <a-menu-item key="duplicate" @click="handleSubMenuClick('duplicate')">
        <template #icon>
          <BlockOutlined />
        </template>
        <span>Duplicate</span>
        <span class="menu-shortcut">Ctrl+D</span>
      </a-menu-item>

      <a-menu-item key="save" @click="handleSubMenuClick('save')">
        <template #icon>
          <SaveOutlined />
        </template>
        <span>Save</span>
        <span class="menu-shortcut">Ctrl+S</span>
      </a-menu-item>

      <a-menu-item key="clear" @click="handleSubMenuClick('clear')">
        <template #icon>
          <ClearOutlined />
        </template>
        <span>Clear</span>
        <span class="menu-shortcut">Ctrl+Del</span>
      </a-menu-item>

      <a-menu-divider />


      <a-menu-divider />

      <a-menu-item key="lock" @click="handleSubMenuClick('lock')">
        <template #icon>
          <LockOutlined />
        </template>
        <span>Lock</span>
        <span class="menu-shortcut">Ctrl+L</span>
      </a-menu-item>

      <a-menu-item key="lock-all" @click="handleSubMenuClick('lock-all')">
        <template #icon>
          <LockOutlined />
        </template>
        <span>Lock All</span>
        <span class="menu-shortcut">Ctrl+Shift+L</span>
      </a-menu-item>

      <a-menu-item key="unlock" @click="handleSubMenuClick('unlock')">
        <template #icon>
          <UnlockOutlined />
        </template>
        <span>Unlock</span>
        <span class="menu-shortcut">Ctrl+U</span>
      </a-menu-item>

      <a-menu-divider />

      <a-menu-item key="select-all" @click="handleSubMenuClick('select-all')">
        <template #icon>
          <CheckOutlined />
        </template>
        <span>Select All</span>
        <span class="menu-shortcut">Ctrl+A</span>
      </a-menu-item>

      <a-menu-item key="select-shape" @click="handleSubMenuClick('select-shape')">
        <template #icon>
          <GatewayOutlined />
        </template>
        <span>Select Shape</span>
        <span class="menu-shortcut">Alt+S</span>
      </a-menu-item>


      <a-menu-divider />


      <a-sub-menu key="sub1">
        <template #icon>
          <SwapOutlined />
        </template>
        <template #title>Flip</template>
        <template #expandIcon>
          <right-outlined class="sub-menu-icon" />
        </template>
        <a-menu-item key="sub1-1" @click="handleSubMenuClick('sub1-1')">
          <span>Flip Horization</span>
          <span class="menu-shortcut">Alt+1</span>
        </a-menu-item>
        <a-menu-item key="sub1-2" @click="handleSubMenuClick('sub1-2')">
          <span>Flip Vertical</span>
          <span class="menu-shortcut">Alt+2</span>
        </a-menu-item>
      </a-sub-menu>

      <a-sub-menu key="sub3">
        <template #icon>
          <CompressOutlined />
        </template>
        <template #title>Make Same</template>
        <template #expandIcon>
          <right-outlined class="sub-menu-icon" />
        </template>
        <a-menu-item key="sub3-1" @click="handleSubMenuClick('make-same-width')">
          <span>Same Width</span>
          <span class="menu-shortcut">Alt+W</span>
        </a-menu-item>
        <a-menu-item key="sub3-2" @click="handleSubMenuClick('make-same-height')">
          <span>Same Height</span>
          <span class="menu-shortcut">Alt+H</span>
        </a-menu-item>
        <a-menu-item key="sub3-3" @click="handleSubMenuClick('make-both-same')">
          <span>Same Both</span>
          <span class="menu-shortcut">Alt+B</span>
        </a-menu-item>
      </a-sub-menu>



      <a-sub-menu key="sub2">
        <template #icon>
          <rotate-right-outlined />
        </template>
        <template #title>Rotate</template>
        <template #expandIcon>
          <right-outlined class="sub-menu-icon" />
        </template>
        <a-menu-item key="sub2-1" @click="handleSubMenuClick('rotate-0')">
          <span>0°</span>
          <span class="menu-shortcut">Alt+R,0</span>
        </a-menu-item>
        <a-menu-item key="sub2-2" @click="handleSubMenuClick('rotate-45')">
          <span>45°</span>
          <span class="menu-shortcut">Alt+R,1</span>
        </a-menu-item>
        <a-menu-item key="sub2-3" @click="handleSubMenuClick('rotate-90')">
          <span>90°</span>
          <span class="menu-shortcut">Alt+R,2</span>
        </a-menu-item>
        <a-menu-item key="sub2-4" @click="handleSubMenuClick('rotate-135')">
          <span>135°</span>
          <span class="menu-shortcut">Alt+R,3</span>
        </a-menu-item>
        <a-menu-item key="sub2-5" @click="handleSubMenuClick('rotate-180')">
          <span>180°</span>
          <span class="menu-shortcut">Alt+R,4</span>
        </a-menu-item>
        <a-menu-item key="sub2-6" @click="handleSubMenuClick('rotate-225')">
          <span>225°</span>
          <span class="menu-shortcut">Alt+R,5</span>
        </a-menu-item>
        <a-menu-item key="sub2-7" @click="handleSubMenuClick('rotate-270')">
          <span>270°</span>
          <span class="menu-shortcut">Alt+R,6</span>
        </a-menu-item>
        <a-menu-item key="sub2-8" @click="handleSubMenuClick('rotate-360')">
          <span>360°</span>
          <span class="menu-shortcut">Alt+R,7</span>
        </a-menu-item>
        <!-- <a-menu-item key="sub2-9" @click="handleSubMenuClick('rotate-custom')">
          <span>Custom rotate</span>
          <span class="menu-shortcut">Alt+R,C</span>
        </a-menu-item> -->
      </a-sub-menu>


      <a-sub-menu key="alignmentSub">
        <template #icon>
          <AlignLeftOutlined />
        </template>
        <template #title>Alignment</template>
        <template #expandIcon>
          <right-outlined class="sub-menu-icon" />
        </template>
        <a-menu-item key="align-left" @click="handleSubMenuClick('align-left')">
          <span>Align Left</span>
          <span class="menu-shortcut">Alt+L</span>
        </a-menu-item>
        <a-menu-item key="align-center" @click="handleSubMenuClick('align-center')">
          <span>Align Center</span>
          <span class="menu-shortcut">Alt+C</span>
        </a-menu-item>
        <a-menu-item key="align-right" @click="handleSubMenuClick('align-right')">
          <span>Align Right</span>
          <span class="menu-shortcut">Alt+R</span>
        </a-menu-item>
        <a-menu-item key="align-top" @click="handleSubMenuClick('align-top')">
          <span>Align Top</span>
          <span class="menu-shortcut">Alt+T</span>
        </a-menu-item>
        <a-menu-item key="align-middle" @click="handleSubMenuClick('align-middle')">
          <span>Align Middle</span>
          <span class="menu-shortcut">Alt+M</span>
        </a-menu-item>
        <a-menu-item key="align-bottom" @click="handleSubMenuClick('align-bottom')">
          <span>Align Bottom</span>
          <span class="menu-shortcut">Alt+B</span>
        </a-menu-item>
      </a-sub-menu>


      <a-menu-divider />

      <a-menu-item key="group" @click="handleSubMenuClick('group')">
        <template #icon>
          <ApartmentOutlined />
        </template>
        <span>Group</span>
        <span class="menu-shortcut">Ctrl+G</span>
      </a-menu-item>

      <a-menu-item key="ungroup" @click="handleSubMenuClick('ungroup')">
        <template #icon>
          <NodeIndexOutlined />
        </template>
        <span>Ungroup</span>
        <span class="menu-shortcut">Ctrl+Shift+G</span>
      </a-menu-item>


      <a-menu-divider />

      <a-menu-item key="bring-to-front" @click="handleSubMenuClick('bring-to-front')">
        <template #icon>
          <VerticalAlignTopOutlined />
        </template>
        <span>Bring to Front</span>
        <span class="menu-shortcut">Shift+PgUp</span>
      </a-menu-item>

      <a-menu-item key="send-to-back" @click="handleSubMenuClick('send-to-back')">
        <template #icon>
          <VerticalAlignBottomOutlined />
        </template>
        <span>Send to Back</span>
        <span class="menu-shortcut">Shift+PgDn</span>
      </a-menu-item>





    </a-menu>

  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
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
