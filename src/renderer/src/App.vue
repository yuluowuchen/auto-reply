<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { HomeFilled, UploadFilled, UserFilled, Expand, Fold, Menu } from '@element-plus/icons-vue'
import { useTabsStore } from './store/tabs'
import { storeToRefs } from 'pinia'
import WebView from './components/WebView.vue'

const router = useRouter()
const route = useRoute()
const tabsStore = useTabsStore()
const { activeTabId, tabsList } = storeToRefs(tabsStore)

// 菜单折叠状态
const isCollapse = ref(true)

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
  // 切换到主应用标签
  tabsStore.activeTabId = 'app_main'
  router.push(index)
}
</script>

<template>
  <el-container class="layout-container">
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
        <el-menu-item index="/publish">
          <el-icon><UploadFilled /></el-icon>
          <span class="menu-title">发布</span>
        </el-menu-item>
        <el-menu-item index="/accounts">
          <el-icon><UserFilled /></el-icon>
          <span class="menu-title">账号</span>
        </el-menu-item>
        <el-menu-item index="/features">
          <el-icon><Menu /></el-icon>
          <span class="menu-title">功能</span>
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
  flex: 1;
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
  font-size: 12px;
  line-height: 1;
}

.el-menu-item.is-active {
  background-color: #ecf5ff;
  color: #409eff;
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
  transition: color 0.3s;
}

.collapse-btn:hover {
  color: #409eff;
}

/* 顶部标签页样式 */
.tabs-header {
  background-color: #ffffff;
  padding: 0;
  border-bottom: 1px solid #e6e6e6;
}

.el-tabs--card > .el-tabs__header {
  border-bottom: none !important;
  margin: 0 !important;
}

.el-tabs__item {
  height: 40px !important;
  line-height: 40px !important;
  font-size: 13px;
}

/* 内容区域样式 */
.content-main {
  background-color: #ffffff;
  margin: 10px;
  border-radius: 8px;
  padding: 0 !important;
  overflow: hidden; /* 防止 webview 溢出 */
  position: relative;
}

.app-content-wrapper, .web-content-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
}

.app-content-wrapper {
  overflow-y: auto;
}
</style>
