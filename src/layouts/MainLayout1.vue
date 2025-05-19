<template>
  <a-layout class="layout">
    <a-layout-header class="header">
      <div class="container header-container">
        <div class="logo">
          <router-link to="/">
            <img src="../assets/logo.png" alt="ModelScope" height="28" />
          </router-link>
        </div>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          theme="light"
          mode="horizontal"
          class="main-menu"
        >
          <a-menu-item key="home">
            <router-link to="/new">首页</router-link>
          </a-menu-item>
          <a-menu-item key="models">
            <router-link to="/new/models">模型</router-link>
          </a-menu-item>
          <a-menu-item key="datasets">
            <router-link to="/new/datasets">数据集</router-link>
          </a-menu-item>
          <a-menu-item key="studios">
            <router-link to="/new/studios">创空间</router-link>
          </a-menu-item>
          <a-menu-item key="docs">
            <router-link to="/new/docs">文档</router-link>
          </a-menu-item>
        </a-menu>
        <div class="header-actions">
          <a-input-search
            placeholder="搜索模型、数据集、应用"
            style="width: 200px; margin-right: 16px"
          />
          <a-button type="primary">登录</a-button>
        </div>
      </div>
    </a-layout-header>

    <a-layout-content class="main-content">
      <slot></slot>
    </a-layout-content>

    <a-layout-footer class="footer">
      <div class="container">
        <a-row :gutter="24">
          <a-col :xs="24" :sm="12" :md="6">
            <h4>平台</h4>
            <a-list item-layout="vertical" :split="false">
              <a-list-item>
                <a href="#">模型</a>
              </a-list-item>
              <a-list-item>
                <a href="#">数据集</a>
              </a-list-item>
              <a-list-item>
                <a href="#">创空间</a>
              </a-list-item>
              <a-list-item>
                <a href="#">文档</a>
              </a-list-item>
            </a-list>
          </a-col>

          <a-col :xs="24" :sm="12" :md="6">
            <h4>社区</h4>
            <a-list item-layout="vertical" :split="false">
              <a-list-item>
                <a href="#">GitHub</a>
              </a-list-item>
              <a-list-item>
                <a href="#">论坛</a>
              </a-list-item>
              <a-list-item>
                <a href="#">开发者</a>
              </a-list-item>
            </a-list>
          </a-col>

          <a-col :xs="24" :sm="12" :md="6">
            <h4>公司</h4>
            <a-list item-layout="vertical" :split="false">
              <a-list-item>
                <a href="#">关于我们</a>
              </a-list-item>
              <a-list-item>
                <a href="#">博客</a>
              </a-list-item>
              <a-list-item>
                <a href="#">加入我们</a>
              </a-list-item>
            </a-list>
          </a-col>

          <a-col :xs="24" :sm="12" :md="6">
            <h4>关注我们</h4>
            <div class="social-icons">
              <a-space>
                <a href="#">
                  <github-outlined />
                </a>
                <a href="#">
                  <wechat-outlined />
                </a>
                <a href="#">
                  <weibo-outlined />
                </a>
              </a-space>
            </div>
            <div class="newsletter">
              <p>订阅我们的更新</p>
              <a-input-search
                placeholder="您的邮箱"
                enter-button="订阅"
                @search="onSubscribe"
              />
            </div>
          </a-col>
        </a-row>

        <div class="copyright">
          <p>&copy; 2023 ModelScope. All Rights Reserved.</p>
          <a-space>
            <a href="#">隐私政策</a>
            <a href="#">使用条款</a>
          </a-space>
        </div>
      </div>
    </a-layout-footer>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  GithubOutlined,
  WechatOutlined,
  WeiboOutlined
} from '@ant-design/icons-vue'

const route = useRoute()
const selectedKeys = ref<string[]>(['home'])

// Update selected menu based on route
watch(() => route.path, (path) => {
  if (path === '/') selectedKeys.value = ['home']
  else if (path.includes('/models')) selectedKeys.value = ['models']
  else if (path.includes('/datasets')) selectedKeys.value = ['datasets']
  else if (path.includes('/studios')) selectedKeys.value = ['studios']
  else if (path.includes('/docs')) selectedKeys.value = ['docs']
}, { immediate: true })

const onSubscribe = (value: string) => {
  console.log('Subscribed with email:', value)
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
}

.header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 0;
}

.header-container {
  display: flex;
  align-items: center;
  height: 64px;
}

.logo {
  margin-right: 40px;
}

.main-menu {
  flex: 1;
  border-bottom: none;
}

.header-actions {
  display: flex;
  align-items: center;
}

.main-content {
  padding-top: 16px;
  min-height: calc(100vh - 64px - 300px);
}

.footer {
  background: #001529;
  color: rgba(255, 255, 255, 0.65);
  padding: 60px 0 20px;
}

.footer h4 {
  color: white;
  margin-bottom: 16px;
  font-size: 16px;
}

.footer a {
  color: rgba(255, 255, 255, 0.65);
}

.footer a:hover {
  color: #1890ff;
}

.social-icons {
  font-size: 24px;
  margin-bottom: 16px;
}

.newsletter {
  margin-top: 16px;
}

.newsletter p {
  margin-bottom: 8px;
}

.copyright {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}
</style>
