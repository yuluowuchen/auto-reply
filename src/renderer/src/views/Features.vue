<template>
  <div class="features-container">
    <div class="platform-header">
      <img src="../assets/douyin-logo.png" alt="抖音" class="platform-icon" v-if="hasDouyinLogo" />
      <span v-else class="douyin-symbol">抖音</span>
      <h2 class="platform-title">抖音</h2>
    </div>

    <div class="feature-grid">
      <!-- AI 智能接待 -->
      <el-card class="feature-card" shadow="hover" @click="goToAiReply">
        <div class="card-header">
          <el-icon class="feature-icon ai-icon"><ChatLineRound /></el-icon>
          <el-badge value="NEW" class="new-badge" />
        </div>
        <div class="card-content">
          <h3 class="feature-name">AI 智能接待</h3>
          <p class="feature-desc">配置账号人设与知识库</p>
        </div>
      </el-card>

      <!-- 私信自动回复 -->
      <!-- <el-card class="feature-card" shadow="hover" @click="goToAutoReply">
        <div class="card-header">
          <el-icon class="feature-icon reply-icon"><Promotion /></el-icon>
        </div>
        <div class="card-content">
          <h3 class="feature-name">私信自动回复</h3>
          <p class="feature-desc">暂无策略</p>
        </div>
      </el-card> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ChatLineRound, Promotion } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'



const router = useRouter()
const hasDouyinLogo = ref(false)

const goToAutoReply = () => {
  //提示开发中
 ElMessage({
    message: '私信自动回复功能暂未开发',
    type: 'warning',
  })
  router.push('/auto-reply')
}

// 跳转 AI 智能接待页面
const goToAiReply = () => {
  //提示开发中
 ElMessage({
    message: 'AI 智能接待功能开发中',
    type: 'warning',
  })
  // router.push('/ai-reply')
}

// 实际项目中可以检查资源是否存在
onMounted(() => {
  // 逻辑处理
})
</script>

<style scoped>
.features-container {
  padding: 30px;
  background-color: #f9fafb;
  min-height: 100%;
}

.platform-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
}

.platform-icon {
  width: 24px;
  height: 24px;
}

.douyin-symbol {
  font-size: 24px;
  font-weight: bold;
}

.platform-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1d1d1f;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.feature-card {
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: visible;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.feature-icon {
  font-size: 32px;
  padding: 10px;
  border-radius: 12px;
}

.ai-icon {
  color: #409eff;
  background-color: #ecf5ff;
}

.reply-icon {
  color: #67c23a;
  background-color: #f0f9eb;
}

.new-badge :deep(.el-badge__content) {
  background-color: #f56c6c;
  border: none;
  font-weight: bold;
  border-radius: 6px;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
}

.card-content {
  text-align: left;
}

.feature-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1d1d1f;
}

.feature-desc {
  font-size: 14px;
  color: #86868b;
  margin: 0;
}
</style>
