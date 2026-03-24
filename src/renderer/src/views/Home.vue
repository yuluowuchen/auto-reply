<template>
  <div class="home-container">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <span>欢迎来到分发中心</span>
        </div>
      </template>
      <div class="content">
        <p>这是一个基于 Electron + Puppeteer Stealth 的一键分发程序。</p>
        <div class="action-buttons">
          <el-button type="success" @click="checkBotDetection">
            打开环境指纹检测 (bot.sannysoft.com)
          </el-button>
        </div>
      </div>
    </el-card>

    <el-alert
      title="环境说明"
      type="info"
      description="当前已全局开启 Stealth 反检测模式，并强制替换了 User-Agent 以移除 Electron 指纹。"
      show-icon
      style="margin-top: 20px"
    />
  </div>
</template>

<script setup lang="ts">
import { useTabsStore } from '../store/tabs'
import { ElMessage } from 'element-plus'

const tabsStore = useTabsStore()

const checkBotDetection = () => {
  const id = 'bot_check'
  tabsStore.addTab({
    id,
    title: '环境检测',
    type: 'web',
    url: 'https://douyin.com',
    partition: 'persist:douyin_login_28610688395'
  })
  ElMessage.success('已开启指纹检测标签页')
}
</script>

<style scoped>
.home-container {
  padding: 20px;
}
.welcome-card {
  max-width: 600px;
}
.action-buttons {
  margin-top: 20px;
}
</style>
