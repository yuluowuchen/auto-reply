<template>
  <div class="chat-webview-container">
    <!-- 左侧 WebView 区域 -->
    <div class="webview-side">
      <WebView :id="id" :src="src" :partition="partition" />
      <!-- 拖拽时的遮罩层，防止 webview 拦截鼠标事件 -->
      <div v-if="isResizing" class="resize-overlay"></div>
    </div>

    <!-- 拖动条 -->
    <div class="resize-handle" :class="{ 'is-resizing': isResizing }" @mousedown="startResize"></div>

    <!-- 右侧 功能 区域 -->
    <div class="script-side" :style="{ width: sideWidth + 'px' }">
      <el-tabs v-model="activeTab" class="side-tabs">
        <!-- 常用话术 -->
        <el-tab-pane label="常用话术" name="scripts">
          <div class="tab-content">
            <div class="side-header">
              <span class="side-title">常用话术</span>
              <el-button type="primary" size="small" :icon="Plus" circle @click="handleAddScript" />
            </div>
            <div class="script-list">
              <div v-for="(script, index) in scripts" :key="index" class="script-item">
                <div class="script-main">
                  <el-button 
                    type="primary" 
                    size="small" 
                    :icon="Position" 
                    circle 
                    class="send-btn-mini"
                    @click="sendScript(script)"
                    title="发送到聊天框"
                  />
                  <div class="script-content">{{ script }}</div>
                </div>
                <div class="script-actions-hover">
                  <el-button link type="primary" :icon="Edit" @click="handleEditScript(index, script)"></el-button>
                  <el-button link type="primary" :icon="CopyDocument" @click="copyScript(script)"></el-button>
                  <el-button link type="danger" :icon="Delete" @click="removeScript(index)" />
                </div>
              </div>
              <el-empty v-if="scripts.length === 0" description="暂无常用话术" :image-size="60" />
            </div>
          </div>
        </el-tab-pane>

        <!-- 自动回复 -->
        <el-tab-pane label="自动回复" name="autoReply">
          <div class="tab-content">
            <div class="side-header">
              <span class="side-title">自动回复设置</span>
              <el-switch v-model="autoReplyForm.enabled" @change="saveAutoReplyConfig" />
            </div>
            
            <div v-if="autoReplyForm.enabled" class="auto-reply-config">
              <el-form :model="autoReplyForm" label-position="top">
                <el-form-item label="触发模式">
                  <el-radio-group v-model="autoReplyForm.triggerRule" @change="saveAutoReplyConfig">
                    <el-radio label="keyword">关键词匹配</el-radio>
                    <el-radio label="instant">立即回复</el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item v-if="autoReplyForm.triggerRule === 'keyword'" label="关键词 (逗号分隔)">
                  <el-input 
                    v-model="autoReplyForm.keywordsStr" 
                    placeholder="例如: 你好,价格,怎么买" 
                    @blur="saveAutoReplyConfig"
                  />
                </el-form-item>

                <el-form-item label="回复内容">
                  <el-input
                    v-model="autoReplyForm.replyContent"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入自动回复的内容"
                    @blur="saveAutoReplyConfig"
                  />
                </el-form-item>
              </el-form>
              <div class="config-tips">
                * 设置将实时保存并生效，回复多条消息时请换行
              </div>
            </div>
            <div v-else class="empty-state">
              <el-empty description="自动回复未启用" :image-size="60" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Delete, CopyDocument, Position, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import WebView from './WebView.vue'

const props = defineProps<{
  id: string
  src: string
  partition?: string
}>()

// 状态控制
const activeTab = ref('scripts')
const sideWidth = ref(300)
const isResizing = ref(false)

// 自动回复配置
const autoReplyForm = ref({
  enabled: false,
  triggerRule: 'keyword',
  keywordsStr: '',
  replyContent: ''
})

// 话术列表数据 (实际开发中可以存储到 localStorage 或通过 API 获取)
const scripts = ref<string[]>([
  '您好，很高兴为您服务！',
  '请问有什么可以帮您的？',
  '好的，请稍等，我为您查询一下。',
  '感谢您的咨询，祝您生活愉快！'
])

// 添加话术
const handleAddScript = () => {
  ElMessageBox.prompt('请输入常用话术', '添加话术', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '话术内容不能为空'
  }).then(({ value }) => {
    if (value) {
      scripts.value.push(value)
      saveScripts()
    }
  }).catch(() => {})
}

// 修改话术
const handleEditScript = (index: number, oldVal: string) => {
  ElMessageBox.prompt('请修改常用话术', '修改话术', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: oldVal,
    inputPattern: /\S+/,
    inputErrorMessage: '话术内容不能为空'
  }).then(({ value }) => {
    if (value) {
      scripts.value[index] = value
      saveScripts()
    }
  }).catch(() => {})
}

// 发送话术到聊天框
const sendScript = (text: string) => {
  window.api.sendManualScript(props.id, text)
}

// 删除话术
const removeScript = (index: number) => {
  scripts.value.splice(index, 1)
  saveScripts()
}

// 复制话术到剪贴板
const copyScript = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  })
}

// 本地存储话术 (简单实现)
const saveScripts = () => {
  localStorage.setItem('common_scripts', JSON.stringify(scripts.value))
}

const loadScripts = () => {
  const saved = localStorage.getItem('common_scripts')
  if (saved) {
    scripts.value = JSON.parse(saved)
  }
}

// 自动回复配置保存
const saveAutoReplyConfig = () => {
  const config = {
    ...autoReplyForm.value,
    // 英文和中文逗号都支持
    keywords: autoReplyForm.value.keywordsStr.split(/[,\uFF0C]/).map(k => k.trim()).filter(k => k)
  }
  localStorage.setItem(`auto_reply_config_${props.id}`, JSON.stringify(config))
  
  // 通知主进程更新配置
  window.api.updateAutoReplyConfig(props.id, config)
}

const loadAutoReplyConfig = () => {
  const saved = localStorage.getItem(`auto_reply_config_${props.id}`)
  if (saved) {
    const config = JSON.parse(saved)
    autoReplyForm.value = {
      ...config,
      // 英文和中文逗号都支持
      keywordsStr: config.keywords?.join(',') || ''
    }
    // 通知主进程更新配置
    window.api.updateAutoReplyConfig(props.id, config)
  }  
}

// 拖动调整宽度
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sideWidth.value
  
  const handleMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = startX - moveEvent.clientX
    sideWidth.value = Math.max(200, Math.min(600, startWidth + deltaX))
  }
  
  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

onMounted(() => {
  loadScripts()
  loadAutoReplyConfig()
})
</script>

<style scoped>
.chat-webview-container {
  display: flex;
  height: 100%;
  width: 100%;
  background-color: #fff;
}

.webview-side {
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.resize-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: transparent;
}

.resize-handle {
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background-color: #f0f0f0;
  transition: background-color 0.2s;
  z-index: 101;
}

.resize-handle:hover,
.resize-handle.is-resizing {
  background-color: #409eff;
}

.script-side {
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  position: relative;
  min-width: 200px;
}

.side-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__header) {
  margin: 0;
  background-color: #fff;
  padding: 0 10px;
  flex-shrink: 0;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
}

.tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.side-header {
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e6e6e6;
  background-color: #fff;
}

.side-title {
  font-weight: bold;
  font-size: 14px;
  color: #303133;
}

.script-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.auto-reply-config {
  padding: 15px;
  overflow-y: auto;
  flex: 1;
}

.config-tips {
  font-size: 12px;
  color: #909399;
  margin-top: 10px;
}

.empty-state {
  margin-top: 60px;
}

.script-item {
  background-color: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  transition: all 0.3s;
  position: relative;
}

.script-item:hover {
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  border-color: #409eff;
}

.script-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.send-btn-mini {
  flex-shrink: 0;
  margin-top: 2px;
}

.script-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  word-break: break-all;
  flex: 1;
}

.script-actions-hover {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0 8px;
  border-radius: 0 6px 6px 0;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.script-item:hover .script-actions-hover {
  opacity: 1;
  pointer-events: auto;
}
</style>
