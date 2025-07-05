<template>
  <a-layout-header class="header">
    <div class="logo">
      <img src="../../assets/logo.png" alt="Logo" />
      <label>T3000</label>
    </div>

    <!-- Desktop menu -->
    <a-menu class="desktop-menu" v-model:selectedKeys="topMenuCurrent" mode="horizontal">
      <a-menu-item v-for="item in menuItems" :key="item.key" @click="handleMenuClick(item.key)">
        <router-link :to="item.route">{{ item.title }}</router-link>
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
    <a-menu v-model:selectedKeys="topMenuCurrent" mode="vertical">
      <a-menu-item v-for="item in menuItems" :key="item.key" @click="handleMenuClick(item.key)">
        <router-link :to="item.route">{{ item.title }}</router-link>
      </a-menu-item>
    </a-menu>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MenuOutlined } from '@ant-design/icons-vue'
import { topMenuCurrent } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant'

defineOptions({
  name: 'Header-Component'
});

const mobileMenuVisible = ref(false);

const menuItems = [
  {
    key: "dashboard",
    title: "Dashboard",
    route: "/new/dashboard"
  },
  {
    key: "new-ui",
    title: "New UI",
    route: "/hvac/t2"
  },
  {
    key: "chartjs-dashboard",
    title: "Chart.js Dashboard",
    route: "/new/chartjs-dashboard"
  },
  {
    key: "app-library",
    title: "Application Library",
    route: "/new/app-library"
  },
  {
    key: "modbus-register",
    title: "Modbus Register",
    route: "/modbus-register"
  },
  {
    key: "schedules",
    title: "Schedules",
    route: "/new/schedules"
  },
  {
    key: "holidays",
    title: "Holidays",
    route: "/new/holidays"
  }
];

// It does not work if this page is refreshed; refer to the onMounted hook below.
const handleMenuClick = (key: string) => {
  topMenuCurrent.value = [key];
  mobileMenuVisible.value = false; // Close mobile menu after selection

  console.log(`Menu item clicked: ${key}`, topMenuCurrent.value);
};

onMounted(() => {
  // Get current URL path without the hash prefix
  const currentPath = window.location.hash.slice(1); // e.g., "/new/holidays"

  // Try exact match first
  let matchedItem = menuItems.find(item => item.route === currentPath);

  if (!matchedItem) {
    // If no exact match, try matching by the last segment
    const lastSegment = currentPath.split('/').pop();

    matchedItem = menuItems.find(item => {
      const routeLastSegment = item.route.split('/').pop();
      return routeLastSegment === lastSegment;
    });
  }

  if (matchedItem) {
    topMenuCurrent.value = [matchedItem.key];
    console.log(`Set active menu from URL: ${matchedItem.key}`);
  }
});

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
