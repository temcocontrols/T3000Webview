<template>
  <a-layout-header class="header">
    <div class="logo">
      <img src="../../assets/logo.png" alt="Logo" />
       <label>T3000</label>
    </div>
    <a-menu
      v-model:selectedKeys="selectedKeys"
      theme="light"
      mode="horizontal"
      :style="{ lineHeight: '64px' }"
    >
      <a-menu-item key="hvac">
         <router-link to="/new/hvac">HVAC Drawer</router-link>
      </a-menu-item>
      <a-menu-item key="test1">
          <router-link to="/new/test1">Application Library</router-link>
      </a-menu-item>
      <a-menu-item key="models">
         <router-link to="/new/datasets">Modbus Register</router-link>
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
    const selectedKeys = ref(['hvac'])
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
  margin-right: 32px;
  display: flex;
  align-items: center;
  font-size: 14px;
  display: -ms-flexbox;
  -webkit-box-align: center;
}

.logo img {
  height: 16px;
}

.logo label {
 font-size: 20px;
  font-weight: 700;
  margin-bottom: 3px;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
    background-clip: border-box;
  background-clip: border-box;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-left:10px;
}

.header-right {
  margin-left: auto;
}
</style>
