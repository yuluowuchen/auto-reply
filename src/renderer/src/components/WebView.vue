<template>
  <div class="web-view-container">
    <div class="web-header">
      <el-button-group>
        <el-button :icon="ArrowLeft" size="small" @click="goBack" :disabled="!isReady" />
        <el-button :icon="ArrowRight" size="small" @click="goForward" :disabled="!isReady" />
        <el-button :icon="Refresh" size="small" @click="reload" :disabled="!isReady" />
      </el-button-group>
      <el-input v-model="currentUrl" size="small" class="url-input" readonly />
      <el-button type="info" size="small" plain @click="openDevTools" :disabled="!isReady">
        控制台
      </el-button>
    </div>
    <webview
      ref="webviewRef"
      :src="src"
      :partition="partition"
      class="webview"
      allowpopups
      webpreferences="contextIsolation=yes, backgroundThrottling=false"
    ></webview>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, ArrowRight, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useTabsStore } from '../store/tabs'

const props = defineProps<{
  id: string
  src: string
  partition?: string
}>()

const tabsStore = useTabsStore()
const webviewRef = ref<any>(null)
const currentUrl = ref(props.src)
const isReady = ref(false)
const isLoginSuccess = ref(false)

const goBack = () => {
  if (isReady.value && webviewRef.value?.canGoBack()) {
    webviewRef.value.goBack()
  }
}
const goForward = () => {
  if (isReady.value && webviewRef.value?.canGoForward()) {
    webviewRef.value.goForward()
  }
}
const reload = () => {
  if (isReady.value) {
    webviewRef.value.reload()
  }
}
const openDevTools = () => {
  if (isReady.value) {
    webviewRef.value.openDevTools()
  }
}

onMounted(() => {
  if (webviewRef.value) {
    // 监听 dom-ready 事件，确保 webview 准备就绪
    webviewRef.value.addEventListener('dom-ready', () => {
      isReady.value = true
    })

    webviewRef.value.addEventListener('did-navigate', (event: any) => {
      currentUrl.value = event.url
    })
    webviewRef.value.addEventListener('did-navigate-in-page', (event: any) => {
      currentUrl.value = event.url
    })

    // 监听全局登录成功事件，如果是登录标签页则自动关闭
    window.api.onDouyinLoginSuccess((data: any) => {
      if (props.id.startsWith('login_douyin_')) {
        isLoginSuccess.value = true
        ElMessage.success(`账号抓取成功并已自动保存！`)
        console.log("登录成功数据" + data.id,props.id, props.partition)
        // 保存账号信息
        // window.api.saveAccount({
        //   id: data.id,
        //   platform: 'douyin',
        //   nickname: data.nickname,
        //   avatar: data.avatar,
        //   partition: props.partition || 'default'
        // })
        // 关闭登录标签页
        tabsStore.closeTab(props.id)
      }
    })
  }
})

onUnmounted(() => {
  // 如果是登录页面且没有成功获取到账号信息就关闭了，说明用户放弃登录或异常关闭
  // 此时清理对应的 partition 数据，避免磁盘空间占用
  if (props.id.startsWith('login_douyin_') && !isLoginSuccess.value && props.partition) {
    console.log(`[WebView] 清理未完成登录的分区数据: ${props.partition}`)
    window.api.clearPartition(props.partition)
  }
})
</script>

<style scoped>
.web-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.web-header {
  padding: 5px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f0f2f5;
  border-bottom: 1px solid #dcdfe6;
}

.url-input {
  flex: 1;
}

.webview {
  flex: 1;
  width: 100%;
  height: 100%;
  border: none;
}
</style>
