<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { HomeFilled,  UserFilled,  Menu, SwitchButton } from '@element-plus/icons-vue'
import { useTabsStore } from './store/tabs'
import { storeToRefs } from 'pinia'
import WebView from './components/WebView.vue'
import ChatWebView from './components/ChatWebView.vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const tabsStore = useTabsStore()
const { activeTabId, tabsList } = storeToRefs(tabsStore)

// 菜单折叠状态
const isCollapse = ref(true)

// 是否显示布局（登录页不显示）
const showLayout = computed(() => route.name !== 'Login')

// 左侧菜单当前激活项 (仅在主应用标签页有效)
const activeMenu = computed(() => route.path)

// 切换菜单折叠
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

// 处理标签点击
const handleTabClick = (pane: any) => {
  tabsStore.activeTabId = pane.props.name
}

// 处理标签关闭
const handleTabRemove = (name: string) => {
  tabsStore.closeTab(name)
}

// 侧边栏菜单点击
const handleMenuSelect = (index: string) => {
  if (index === 'logout') {
    handleLogout()
    return
  }
  // 切换到主应用标签
  tabsStore.activeTabId = 'app_main'
  router.push(index)
}

// 退出登录
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      // 调用后端退出接口
      await window.api.verify.logout()
    } catch (e) {
      console.error('退出登录异常:', e)
    } finally {
      // 清除本地登录状态
      localStorage.removeItem('auth_token')
      ElMessage.success('已安全退出')
      router.push('/login')
    }
  }).catch(() => {})
}
</script>

<template>
  <div v-if="!showLayout" class="login-layout">
    <router-view />
  </div>
  <el-container v-else class="layout-container">
    <!-- 左侧导航栏 -->
    <el-aside :width="isCollapse ? '70px' : '180px'" class="aside-menu" :class="{ 'is-collapsed': isCollapse }">
      <div class="logo-container">
        <img src="./assets/electron.svg" alt="Logo" class="mini-logo" />
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span class="menu-title">首页</span>
        </el-menu-item>
        <!-- <el-menu-item index="/publish">
          <el-icon><UploadFilled /></el-icon>
          <span class="menu-title">发布</span>
        </el-menu-item> -->
        <el-menu-item index="/accounts">
          <el-icon><UserFilled /></el-icon>
          <span class="menu-title">账号</span>
        </el-menu-item>
        <el-menu-item index="/features">
          <el-icon><Menu /></el-icon>
          <span class="menu-title">功能</span>
        </el-menu-item>
        
        <div class="menu-spacer"></div>

        <el-menu-item index="logout" class="logout-item">
          <el-icon><SwitchButton /></el-icon>
          <span class="menu-title">退出登录</span>
        </el-menu-item>
      </el-menu>

      <div class="collapse-btn" @click="toggleCollapse">
        <el-icon>
          <component :is="isCollapse ? 'Expand' : 'Fold'" />
        </el-icon>
      </div>
    </el-aside>

    <el-container class="main-container">
      <!-- 顶部多标签栏 -->
      <el-header height="40px" class="tabs-header">
        <el-tabs
          v-model="activeTabId"
          type="card"
          class="demo-tabs"
          closable
          @tab-click="handleTabClick"
          @tab-remove="handleTabRemove"
        >
          <el-tab-pane
            v-for="item in tabsList"
            :key="item.id"
            :label="item.title"
            :name="item.id"
            :closable="item.id !== 'app_main'"
          />
        </el-tabs>
      </el-header>

      <!-- 主要内容区域 -->
      <el-main class="content-main">
        <!-- 主应用内容 -->
        <div v-show="activeTabId === 'app_main'" class="app-content-wrapper">
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>

        <!-- Web 标签页内容 -->
        <template v-for="tab in tabsList" :key="tab.id">
          <div v-if="tab.type === 'web'" v-show="activeTabId === tab.id" class="web-content-wrapper">
            <WebView :id="tab.id" :src="tab.url!" :partition="tab.partition" />
          </div>
          <div v-if="tab.type === 'chat'" v-show="activeTabId === tab.id" class="web-content-wrapper">
            <ChatWebView :id="tab.id" :src="tab.url!" :partition="tab.partition" />
          </div>
        </template>
      </el-main>
    </el-container>
  </el-container>
</template>

<style>
/* 全局样式重置 */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.login-layout {
  height: 100vh;
  width: 100vw;
}

.layout-container {
  height: 100vh;
  width: 100vw;
  background-color: #f5f7fa;
}

/* 侧边栏样式 */
.aside-menu {
  background-color: #ffffff;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  transition: width 0.3s;
  position: relative;
}

.logo-container {
  margin-bottom: 20px;
  text-align: center;
}

.mini-logo {
  width: 32px;
  height: 32px;
}

.el-menu-vertical {
  border-right: none !important;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.menu-spacer {
  flex: 1;
}

.logout-item {
  color: #f56c6c !important;
}

.logout-item:hover {
  background-color: #fef0f0 !important;
}

/* 展开状态样式 (默认) */
.el-menu-item {
  display: flex;
  align-items: center;
  height: 50px !important;
  margin: 5px 10px;
  padding: 0 20px !important;
  border-radius: 8px;
}

.el-menu-item .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

.menu-title {
  font-size: 14px;
}

/* 折叠状态样式 */
.aside-menu.is-collapsed .el-menu-item {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 65px !important;
  padding: 0 !important;
  margin: 5px 5px;
}

.aside-menu.is-collapsed .el-menu-item .el-icon {
  margin-right: 0;
  margin-bottom: 4px;
  font-size: 20px;
}

.aside-menu.is-collapsed .menu-title {
  font-size: 11px;
  line-height: 1;
}

/* 底部折叠按钮 */
.collapse-btn {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-top: 1px solid #f0f0f0;
  color: #909399;
}

.collapse-btn:hover {
  color: #409eff;
  background-color: #f5f7fa;
}

/* 顶部标签栏 */
.tabs-header {
  background-color: #ffffff;
  padding: 0 10px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
}

.demo-tabs {
  width: 100%;
}

.demo-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

.demo-tabs :deep(.el-tabs__nav) {
  border: none !important;
}

.demo-tabs :deep(.el-tabs__item) {
  height: 32px;
  line-height: 32px;
  border: 1px solid #e6e6e6 !important;
  border-radius: 4px;
  margin-right: 5px;
  background-color: #f5f7fa;
  font-size: 12px;
}

.demo-tabs :deep(.el-tabs__item.is-active) {
  background-color: #ffffff;
  border-color: #409eff !important;
  color: #409eff;
}

/* 内容区域 */
.content-main {
  padding: 0 !important;
  position: relative;
  background-color: #ffffff;
}

.app-content-wrapper,
.web-content-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
}

.web-content-wrapper {
  overflow: hidden;
}

.el-menu-item.is-active {
  background-color: #ecf5ff;
  color: #409eff;
}
</style>