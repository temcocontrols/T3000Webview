<template>
  <div class="t3-context-menu">
    <a-menu v-model:selectedKeys="selectedKeys" mode="vertical" :theme="theme" @click="handleMenuClick">
      <a-menu-item key="item1">
        <template #icon>
          <file-outlined />
        </template>
        <span>Cut</span>
        <span class="menu-shortcut">Ctrl+x</span>
      </a-menu-item>

      <a-menu-item key="item2">
        <template #icon>
          <edit-outlined />
        </template>
        <span>Copy</span>
        <span class="menu-shortcut">Ctrl+c</span>
      </a-menu-item>

      <a-menu-item key="item2">
        <template #icon>
          <edit-outlined />
        </template>
        <span>Paste</span>
        <span class="menu-shortcut">Ctrl+v</span>
      </a-menu-item>


      <a-sub-menu key="sub1">
        <template #icon>
          <setting-outlined />
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
          <align-center-outlined />
        </template>
        <template #title>Make Same</template>
        <template #expandIcon>
          <right-outlined class="sub-menu-icon" />
        </template>
        <a-menu-item key="sub3-1" @click="handleSubMenuClick('make-same-width')">
          <span>Make Same Width</span>
          <span class="menu-shortcut">Alt+W</span>
        </a-menu-item>
        <a-menu-item key="sub3-2" @click="handleSubMenuClick('make-same-height')">
          <span>Make Same Height</span>
          <span class="menu-shortcut">Alt+H</span>
        </a-menu-item>
        <a-menu-item key="sub3-3" @click="handleSubMenuClick('make-both-same')">
          <span>Make Both Same</span>
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

    </a-menu>

  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import {
  FileOutlined,
  EditOutlined,
  SettingOutlined,
  DeleteOutlined,
  RightOutlined,
  RotateRightOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

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

:deep(.ant-menu-submenu-title) {
  display: flex;
  align-items: center;
}

:deep(.ant-menu-item) {
  display: flex;
  align-items: center;
}
</style>
