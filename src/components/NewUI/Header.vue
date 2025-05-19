<template>
  <a-layout-header class="header">
    <div class="logo">
      <img src="../../assets/logo.png" alt="Logo" />
    </div>
    <a-menu
      v-model:selectedKeys="selectedKeys"
      theme="light"
      mode="horizontal"
      :style="{ lineHeight: '64px' }"
    >
      <a-menu-item key="home">
         <router-link to="/new/new">Home</router-link>
      </a-menu-item>
      <a-menu-item key="studios">Studios
          <router-link to="/new/models">Studios</router-link>
      </a-menu-item>
      <a-menu-item key="models">Models
         <router-link to="/new/datasets">Models</router-link>
      </a-menu-item>
      <a-menu-item key="datasets">Datasets
         <router-link to="/new/studios">Datasets</router-link>
      </a-menu-item>
    </a-menu>
    <div class="header-right">
      <a-button type="primary">Sign In</a-button>
    </div>
  </a-layout-header>
</template>

<script>
import { ref } from 'vue'

export default {
  name:'HeaderView',
  setup() {
    const selectedKeys = ref(['studios'])
    return {
      selectedKeys
    }
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  padding: 0 50px;
  background: #fff;
  box-shadow: 0 2px 8px #f0f1f2;
  position: fixed;
  z-index: 1;
  width: 100%;
}

.logo {
  margin-right: 30px;
}

.logo img {
  height: 32px;
}

.header-right {
  margin-left: auto;
}
</style>
