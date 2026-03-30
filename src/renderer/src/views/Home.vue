<template>
  <div class="home-container">
    <el-row :gutter="20">
      <!-- 左侧：用户信息与公告 -->
      <el-col :span="10">
        <!-- 用户登录信息卡片 -->
        <el-card class="info-card user-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>个人信息</span>
            </div>
          </template>
          <div v-loading="userLoading" class="user-info">
            <div v-if="userInfo" class="info-items">
              <div class="info-item">
                <span class="label">用户名：</span>
                <span class="value">{{ userInfo.User }}</span>
              </div>
              <!-- <div class="info-item">
                <span class="label">用户等级：</span>
                <el-tag size="small" type="success">{{ userInfo.UserClassName }}</el-tag>
              </div> -->
              <div class="info-item">
                <span class="label">到期时间：</span>
                <span class="value">{{ formatTime(userInfo.VipTime) }}</span>
              </div>
              <!-- <div class="info-item">
                <span class="label">账户余额：</span>
                <span class="value highlight">￥{{ userInfo.Rmb || 0 }}</span>
              </div>
              <div class="info-item">
                <span class="label">账户积分：</span>
                <span class="value highlight">{{ userInfo.VipNumber || 0 }}</span>
              </div> -->
              <div class="info-item">
                <span class="label">登录 IP：</span>
                <span class="value">{{ userInfo.LoginIp }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无用户信息" :image-size="60" />
          </div>
        </el-card>

        <!-- 软件介绍卡片 -->
        <el-card class="info-card intro-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><InfoFilled /></el-icon>
              <span>软件介绍</span>
            </div>
          </template>
          <div class="intro-content">
            <p class="intro-text">
              本程序是一款基于 <strong>DOM元素识别+RPA自动化</strong> 开发的智能分发与自动回复系统。
              旨在通过高度拟人化的浏览器环境，为您的社交媒体账号提供安全、高效的自动化管理体验。
            </p>
            <ul class="feature-list">
              <!-- <li><el-icon><CircleCheckFilled /></el-icon> 全局 Stealth 反检测模式</li>
              <li><el-icon><CircleCheckFilled /></el-icon> 动态指纹与 UA 自动替换</li> -->
              <li><el-icon><CircleCheckFilled /></el-icon> 多账号隔离与持久化会话</li>
              <li><el-icon><CircleCheckFilled /></el-icon> 智能脚本引擎与定时任务</li>
            </ul>
            <!-- <div class="action-buttons">
              <el-button type="primary" plain @click="checkBotDetection">
                <el-icon><Monitor /></el-icon> 环境指纹检测
              </el-button>
            </div> -->
          </div>
        </el-card>
        
      </el-col>

      <!-- 右侧：软件介绍与常见问题 -->
      <el-col :span="14">
        <!-- 应用公告卡片 -->
        <el-card class="info-card notice-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Notification /></el-icon>
              <span>最新公告</span>
            </div>
          </template>
          <div v-loading="noticeLoading" class="notice-content">
            <div v-if="notice" class="notice-text" v-html="notice"></div>
            <el-empty v-else description="暂无公告" :image-size="60" />
          </div>
        </el-card>

        <!-- 常见问题卡片 -->
        <el-card class="info-card faq-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><QuestionFilled /></el-icon>
              <span>常见问题 (FAQ)</span>
            </div>
          </template>
          <el-collapse v-model="activeFaq">
            <el-collapse-item title="如何保持账号登录状态？" name="1">
              <div>系统会自动持久化您的浏览器会话（Partition）。只要不手动清除数据，您的登录状态将一直保持。</div>
            </el-collapse-item>
            <el-collapse-item title="为什么脚本执行会失败？" name="2">
              <div>通常是由于网络延迟或目标网站结构变动引起的。请确保网络通畅，或联系管理员更新最新脚本插件。</div>
            </el-collapse-item>
            <el-collapse-item title="软件如何进行更新？" name="3">
              <div>程序启动时会自动检测新版本。若有更新，系统会弹出下载提示，您也可以在首页查看最新下载链接。</div>
            </el-collapse-item>
            <el-collapse-item title="如何添加多个账号？" name="4">
              <div>在“账号管理”页面点击“添加账号”，每个账号都拥有独立的指纹和存储分区，互不干扰。</div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部版本与下载信息 (根据 FAQ 提示补充) -->
    <div style="margin-top: 30px; text-align: center; padding-bottom: 10px;">
      <el-divider />
      <div style="display: flex; justify-content: center; align-items: center; gap: 24px; color: #909399; font-size: 13px;">        
        <span>当前版本：1.0.0</span>
        <span>最新版本：{{ appVersion }}</span>
        <el-link type="primary" :underline="false" style="font-size: 13px;" :href="appUpdateUrl" target="_blank">
          <el-icon style="margin-right: 4px;"><InfoFilled /></el-icon>
          获取最新版本下载链接
        </el-link>
        <span>© 2026 Smart Distribute System</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTabsStore } from '../store/tabs'
import { ElMessage } from 'element-plus'
import { 
  User, 
  Notification, 
  InfoFilled, 
  QuestionFilled, 
  CircleCheckFilled,
  Monitor
} from '@element-plus/icons-vue'

const tabsStore = useTabsStore()

const userInfo = ref<any>(null)
const notice = ref('')
const userLoading = ref(false)
const noticeLoading = ref(false)
const activeFaq = ref(['1'])
//版本号
const appVersion = ref('v1.0.0')
// 应用更新地址
const appUpdateUrl = ref('')

/**
 * 格式化时间戳
 */
const formatTime = (timestamp: number) => {
  if (!timestamp) return '无'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

/**
 * 获取用户信息
 */
const fetchUserInfo = async () => {
  userLoading.value = true
  try {
    const res = await window.api.verify.getAppUserInfo()
    if (res.success) {
      userInfo.value = res.data?.Data
      // 补充获取余额（如果基础信息里没带）
      const rmbRes = await window.api.verify.getUserRmb()
      if (rmbRes.success) {
        userInfo.value.Rmb = rmbRes.data?.Data?.Rmb
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  } finally {
    userLoading.value = false
  }
}

/**
 * 获取公告
 */
const fetchNotice = async () => {
  noticeLoading.value = true
  try {
    const res = await window.api.verify.getNotice()
    if (res.success) {
      notice.value = res.data?.Data?.AppGongGao || ''
    }
  } catch (error) {
    console.error('获取公告失败:', error)
  } finally {
    noticeLoading.value = false
  }
}

/**
 * 环境检测
 */
const checkBotDetection = () => {
  const id = 'bot_check'
  tabsStore.addTab({
    id,
    title: '环境检测',
    type: 'web',
    url: 'https://bot.sannysoft.com',
    partition: 'persist:bot_check'
  })
  ElMessage.success('已开启指纹检测标签页')
}

/**
 * 检查应用更新
 */
const checkUpdate = async () => {
  const res = await window.api.verify.checkUpdate()
  console.log(res)
  if (res.success) {
    // 更新版本号
    appVersion.value = String(res.data?.Data?.NewVersion) || 'v1.0.0'

    if (res.data?.Data?.IsUpdate) {
      ElMessage({
        message: `发现新的应用版本，请及时更新，新版本：${appVersion.value}`,
        type: 'warning',
      })     
    } else {
      ElMessage({
        message: '当前版本是最新的',
        type: 'success',
      })
    }
  }
}

/**
 * 获取应用更新配置 JSON
 */
const getAppUpdateJson = async () => {
  const res = await window.api.verify.getAppUpdateJson()
  // if (res.success) {
  //   appUpdateUrl.value = res.htmlurl || ''
  // }
  appUpdateUrl.value = res.htmlurl || ''
  // console.log(res.htmlurl)
  // console.log(appUpdateUrl.value)
}



onMounted(() => {
  fetchUserInfo()
  fetchNotice()
  checkUpdate()
  getAppUpdateJson()
})
</script>

<style scoped>
.home-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 40px);
}

.info-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: none;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.1) !important;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.card-header .el-icon {
  font-size: 18px;
  color: #409eff;
}

/* 用户信息样式 */
.user-info {
  padding: 10px 0;
}

.info-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ebeef5;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: #909399;
  font-size: 14px;
}

.value {
  color: #303133;
  font-weight: 500;
  font-size: 14px;
}

.value.highlight {
  color: #f56c6c;
  font-weight: 700;
}

/* 公告样式 */
.notice-content {
  min-height: 110px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 0;
}

.notice-text {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
}

/* 介绍样式 */
.intro-content {
  padding: 10px 0;
}

.intro-text {
  font-size: 15px;
  line-height: 1.6;
  color: #606266;
  margin-bottom: 20px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin-bottom: 25px;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #409eff;
}

.feature-list .el-icon {
  font-size: 16px;
}

.action-buttons {
  display: flex;
  gap: 15px;
}

/* FAQ 样式 */
:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item__header) {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

:deep(.el-collapse-item__content) {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
</style>
