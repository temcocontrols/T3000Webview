<template>
  <div class="t3-context-menu">
    <a-menu v-model:selectedKeys="selectedKeys" mode="vertical" :theme="theme" @click="handleMenuClick">
      <a-menu-item key="item1">
        <template #icon>
          <file-outlined />
        </template>
        <span>Cut</span>
        <span class="menu-shortcut">Ctrl+1</span>
      </a-menu-item>

      <a-menu-item key="item2">
        <template #icon>
          <edit-outlined />
        </template>
        <span>Copy</span>
        <span class="menu-shortcut">Ctrl+2</span>
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

      <a-menu-item key="item4">
        <template #icon>
          <delete-outlined />
        </template>
        <span>Make Same</span>
        <span class="menu-shortcut">Ctrl+4</span>
      </a-menu-item>
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
  RightOutlined
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
