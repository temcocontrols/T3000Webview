<template>
  <a-layout-header class="header">
    <div class="logo">
      <img src="../../assets/logo.png" alt="Logo" />
      <label>T3000</label>
    </div>

    <!-- Desktop menu -->
    <a-menu v-model:selectedKeys="current" mode="horizontal" class="desktop-menu">
      <a-menu-item key="dashboard">
        <router-link to="/new/dashboard">Dashboard</router-link>
      </a-menu-item>
      <a-menu-item key="new-ui">
        <router-link to="/hvac/t2">New UI</router-link>
      </a-menu-item>
      <a-menu-item key="app-library">
        <router-link to="/new/app-library">Application Library</router-link>
      </a-menu-item>
      <a-menu-item key="modbus-register">
        <router-link to="/new/modbus-register">Modbus Register</router-link>
      </a-menu-item>
      <a-menu-item key="schedules">
        <router-link to="/new/schedules">Schedules</router-link>
      </a-menu-item>
      <a-menu-item key="holidays">
        <router-link to="/new/holidays">Holidays</router-link>
      </a-menu-item>
    </a-menu>

    <!-- Mobile menu button -->
    <div class="mobile-menu-button">
      <a-button type="text" @click="mobileMenuVisible = !mobileMenuVisible">
        <menu-outlined />
      </a-button>
    </div>

    <div class="header-right">
      <a-button type="link" size="small">Login</a-button>
    </div>
  </a-layout-header>

  <!-- Mobile menu drawer -->
  <a-drawer placement="left" :visible="mobileMenuVisible" @close="mobileMenuVisible = false" :closable="false"
    width="200" class="mobile-drawer">
    <a-menu v-model:selectedKeys="current" mode="vertical">
      <a-menu-item key="dashboard">
        <router-link to="/new/dashboard">Dashboard</router-link>
      </a-menu-item>
      <a-menu-item key="application">
        <router-link to="/new/test1">Application Library</router-link>
      </a-menu-item>
      <a-menu-item key="modbus">
        <router-link to="/new/datasets">Modbus Register</router-link>
      </a-menu-item>
    </a-menu>
  </a-drawer>
</template>

<script setup lang="ts">
// Script remains the same
import { ref } from 'vue'
import { MenuOutlined } from '@ant-design/icons-vue'

defineOptions({
  name: 'Header-Component'
});

const current = ref<string[]>(['dashboard']);
const mobileMenuVisible = ref(false);
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  box-shadow: 0 2px 8px #f0f1f2;
  position: fixed;
  z-index: 1;
  width: 100%;
  height: 35px;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 20px;
  flex-shrink: 0;
  margin-left: 64px;
}

.logo img {
  height: 16px;
}

.logo label {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-left: 10px;
}

.desktop-menu {
  flex: 1;
  height: 35px;
  line-height: 35px;
  border-bottom: none;
  display: flex;
}

.header-right {
  display: flex;
  align-items: center;
  margin-left: 10px;
  flex-shrink: 0;
  margin-right: 10px;
}

.mobile-menu-button {
  display: none;
  align-items: center;
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .header {
    padding: 0 10px;
  }

  .desktop-menu {
    display: none;
  }

  .mobile-menu-button {
    display: flex;
    order: 2;
  }

  .header-right {
    order: 3;
  }

  .logo {
    margin-right: auto;
    order: 1;
  }

  .logo label {
    font-size: 14px;
  }
}

/* Mobile drawer styles */
.mobile-drawer .ant-drawer-body {
  padding: 0;
}

/* Set the menu height and line-height to match your header */
.ant-layout-header {
  height: 35px;
  line-height: 35px;
  padding: 0;
  /* Remove default padding if any */
}

.ant-menu-horizontal {
  height: 35px;
  line-height: 35px;
  border-bottom: none;
  /* Optional: remove bottom border */
}

.ant-menu-horizontal>.ant-menu-item,
.ant-menu-horizontal>.ant-menu-submenu {
  height: 35px;
  line-height: 35px;
  padding: 0 16px;
  /* Adjust side padding as needed */
  margin: 0;
}

/* Optional: Remove top/bottom padding or margin from menu itself */
.ant-menu {
  padding: 0;
  margin: 0;
}

.ant-menu-light.ant-menu-root.ant-menu-vertical {
  border-inline-end: none;
}
</style>
