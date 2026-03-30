<template>
  <div class="create-strategy-container">
    <!-- 顶部导航栏 -->
    <div class="top-nav">
      <el-button link :icon="Back" @click="goBack" class="back-btn">返回</el-button>
      <div class="page-title">创建策略-私信自动回复</div>
      <el-button type="primary" class="submit-btn" @click="handleSubmit">创建</el-button>
    </div>

    <!-- 表单内容 -->
    <div class="form-content">
      <el-form :model="form" label-width="120px" label-position="left">
        <!-- 策略名称 -->
        <el-form-item label="策略名称">
          <el-input 
            v-model="form.name" 
            placeholder="请输入策略名称" 
            maxlength="20" 
            show-word-limit 
            class="name-input"
          />
        </el-form-item>

        <!-- 账号 -->
        <el-form-item label="账号">
          <div class="account-selection-area">
            <el-tag
              v-for="account in form.selectedAccounts"
              :key="account.id"
              class="account-tag"
              closable
              @close="removeAccount(account)"
            >
              <el-avatar :size="18" :src="account.avatar || defaultAvatar" class="mini-avatar" />
              {{ account.nickname }}
            </el-tag>
            <el-button plain :icon="Plus" class="select-btn" @click="showAccountSelector = true">选择账号</el-button>
          </div>
        </el-form-item>

        <!-- 触发类型 -->
        <el-form-item label="触发类型">
          <template #label>
            <span>触发类型</span>
            <el-tooltip content="设置触发自动回复的条件" placement="top">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-radio-group v-model="form.triggerRule">
            <el-radio label="keyword">关键字匹配</el-radio>
            <el-radio label="instant">即刻回复</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 关键词 (仅在关键字匹配时显示) -->
        <el-form-item v-if="form.triggerRule === 'keyword'" label="关键词">
          <div class="keyword-container">
            <el-tag
              v-for="tag in form.keywords"
              :key="tag"
              class="keyword-tag"
              closable
              :disable-transitions="false"
              @close="removeKeyword(tag)"
            >
              {{ tag }}
            </el-tag>
            <el-button plain :icon="Plus" class="select-btn" @click="handleAddKeyword">新建关键词</el-button>
          </div>
        </el-form-item>

        <!-- 触发用户 -->
        <el-form-item label="触发用户">
          <el-radio-group v-model="form.triggerUser">
            <el-radio label="all">所有用户</el-radio>
            <el-radio label="custom">
              自定义用户
              <el-tooltip content="针对特定标签或属性的用户" placement="top">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 回复内容 -->
        <el-form-item label="回复内容">
          <template #label>
            <span>回复内容</span>
            <el-tooltip content="设置回复给用户的具体内容" placement="top">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          
          <div class="reply-content-box">
            <div 
              v-for="(script, index) in form.scripts" 
              :key="index"
              class="script-item"
            >
              <div class="script-header">
                <span class="script-label">话术{{ index + 1 }}</span>
                <el-radio-group v-model="script.type" class="type-radio">
                  <el-radio label="text">文本</el-radio>
                  <el-radio label="image">图片</el-radio>
                  <el-radio label="card">留资卡片</el-radio>
                </el-radio-group>
                <div class="delay-setting">
                  <span>延迟</span>
                  <el-input-number v-model="script.delay" :min="0" controls-position="right" size="small" class="delay-input" />
                  <span>秒内回复</span>
                </div>
                <el-button 
                  v-if="form.scripts.length > 1"
                  link 
                  type="danger" 
                  class="remove-script-btn"
                  @click="removeScript(index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              
              <div class="script-body">
                <el-input
                  v-model="script.content"
                  type="textarea"
                  :placeholder="script.type === 'text' ? '请输入文本内容' : '请上传资源'"
                  :rows="3"
                  maxlength="1000"
                  show-word-limit
                />
                <div class="script-footer">
                  <div class="footer-left">
                    <el-button link class="tool-btn">😀</el-button>
                    <el-button link :icon="Plus" class="tool-btn">插入变量</el-button>
                    <el-button link :icon="Plus" class="tool-btn">话术</el-button>
                  </div>
                </div>
              </div>
            </div>
            
            <el-button 
              plain 
              :icon="Plus" 
              class="add-script-btn" 
              @click="handleAddScript"
              :disabled="form.scripts.length >= 6"
            >
              新增话术({{ form.scripts.length }}/6)
            </el-button>
          </div>
        </el-form-item>

        <!-- 停止条件 -->
        <el-form-item label="停止条件">
          <div class="stop-conditions">
            <el-checkbox 
              :model-value="form.stopCondition === 'once'" 
              @change="(v: boolean) => updateStopCondition(v, 'once')"
            >
              同一用户仅触发一次策略
            </el-checkbox>
            <div class="condition-item">
              <el-checkbox 
                :model-value="form.stopCondition === 'hourly'" 
                @change="(v: boolean) => updateStopCondition(v, 'hourly')"
              >
                同一用户
              </el-checkbox>
              <el-input-number 
                v-model="form.stopHours" 
                :min="1" 
                controls-position="right" 
                size="small" 
                class="small-number-input" 
                :disabled="form.stopCondition !== 'hourly'"
              />
              <span :class="{ 'disabled-text': form.stopCondition !== 'hourly' }">小时仅回复一次</span>
            </div>
            <el-checkbox 
              :model-value="form.stopCondition === 'afterReply'" 
              @change="(v: boolean) => updateStopCondition(v, 'afterReply')"
            >
              用户回复后停止发送
            </el-checkbox>
          </div>
        </el-form-item>

        <!-- 启用/关闭 -->
        <el-form-item label="启用/关闭">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
    </div>

    <!-- 账号选择器侧边栏 -->
    <el-drawer
      v-model="showAccountSelector"
      title="选择账号"
      direction="rtl"
      size="380px"
      :with-header="false"
      class="account-selector-drawer"
    >
      <AccountSelector
        :initial-selected-ids="form.selectedAccounts.map(a => a.id)"
        @confirm="handleAccountConfirm"
        @cancel="showAccountSelector = false"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Back, Plus, QuestionFilled, Pointer, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import AccountSelector from '../components/AccountSelector.vue'

interface Account {
  id: string
  platform: 'douyin'
  nickname: string
  avatar: string
  partition: string
}

import { useTabsStore } from '../store/tabs'

const tabsStore = useTabsStore()
const router = useRouter()

// 账号选择器状态
const showAccountSelector = ref(false)
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const form = reactive({
  name: '',
  triggerRule: 'keyword',
  keywords: [] as string[],
  selectedAccounts: [] as Account[],
  triggerUser: 'all',
  scripts: [
    { type: 'text', delay: 2, content: '' }
  ],
  stopCondition: 'none',
  stopHours: 1,
  enabled: true
})

const goBack = () => {
  router.back()
}

// 确认账号选择
const handleAccountConfirm = (accounts: Account[]) => {
  form.selectedAccounts = accounts
  showAccountSelector.value = false
}

// 移除账号
const removeAccount = (account: Account) => {
  form.selectedAccounts = form.selectedAccounts.filter(a => a.id !== account.id)
}

// 新建关键词
const handleAddKeyword = () => {
  ElMessageBox.prompt('请输入关键词', '新建关键词', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '关键词不能为空'
  }).then(({ value }) => {
    if (!form.keywords.includes(value)) {
      form.keywords.push(value)
    }
  })
}

// 删除关键词
const removeKeyword = (tag: string) => {
  form.keywords.splice(form.keywords.indexOf(tag), 1)
}

// 新增话术
const handleAddScript = () => {
  if (form.scripts.length < 6) {
    form.scripts.push({ type: 'text', delay: 2, content: '' })
  }
}

// 删除话术
const removeScript = (index: number) => {
  if (form.scripts.length > 1) {
    form.scripts.splice(index, 1)
  }
}

// 更新停止条件
const updateStopCondition = (checked: boolean, type: string) => {
  form.stopCondition = checked ? type : 'none'
}

const handleSubmit = async () => {
  if (!form.name) {
    return ElMessage.warning('请输入策略名称')
  }
  if (form.selectedAccounts.length === 0) {
    return ElMessage.warning('请选择账号')
  }

  try {
    console.log('提交表单:', form)
    
    // 1. 保存策略到主进程
    const policyData = {
      ...JSON.parse(JSON.stringify(form)),
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    await window.api.savePolicy(policyData)

    // 2. 只有当启用状态为 true 时，才为每个选中的账号打开聊天标签页
    if (form.enabled) {
      form.selectedAccounts.forEach((account) => {
        tabsStore.addTab({
          id: `chat_${account.id}`,
          title: `聊天-${account.nickname}`,
          type: 'web',
          url: `https://www.douyin.com/chat?isPopup=1&accountId=${account.id}`,
          partition: account.partition
        })
      })
      ElMessage.success('策略已保存并启动监控')
    } else {
      ElMessage.success('策略已保存')
    }

    router.push('/auto-reply')
  } catch (error) {
    console.error('启动策略失败:', error)
    ElMessage.error('启动策略失败')
  }
  return '成功'
}
</script>

<style scoped>
.create-strategy-container {
  height: 100%;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.top-nav {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #f0f0f0;
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  font-size: 14px;
  color: #333;
}

.page-title {
  font-size: 16px;
  font-weight: bold;
  color: #1d1d1f;
}

.submit-btn {
  background-color: #1d1d1f;
  border-color: #1d1d1f;
  padding: 8px 24px;
}

.form-content {
  flex: 1;
  padding: 40px 100px;
  overflow-y: auto;
}

.name-input {
  width: 100%;
}

.select-btn {
  border-radius: 6px;
  background-color: #f5f5f7;
  border: none;
}

.account-selection-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.account-tag {
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-avatar {
  margin-right: 2px;
}

.keyword-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.keyword-tag {
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
}

.help-icon {
  margin-left: 4px;
  color: #c7c7cc;
  cursor: pointer;
  vertical-align: middle;
}

.reply-content-box {
  width: 100%;
}

.script-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 16px;
  background-color: #fff;
}

.script-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  border-radius: 8px 8px 0 0;
}

.script-label {
  font-weight: bold;
  margin-right: 20px;
}

.type-radio {
  flex: 1;
}

.delay-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.delay-input {
  width: 80px;
}

.remove-script-btn {
  margin-left: 12px;
  font-size: 18px;
}

.script-body :deep(.el-textarea__inner) {
  border: none;
  resize: none;
  padding: 16px;
  box-shadow: none;
}

.script-footer {
  padding: 8px 16px;
  border-top: 1px dotted #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  gap: 12px;
}

.tool-btn {
  color: #666;
  font-size: 13px;
}

.add-script-btn {
  width: 150px;
  border-radius: 6px;
  background-color: #f5f5f7;
  border: none;
}

.stop-conditions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.small-number-input {
  width: 80px;
}

.disabled-text {
  color: #c0c4cc;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #1d1d1f;
}

:deep(.el-radio__input.is-checked .el-radio__inner),
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #409eff;
  border-color: #409eff;
}

:deep(.el-radio__input.is-checked + .el-radio__label),
:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #409eff;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: #409eff;
  border-color: #409eff;
}

:deep(.account-selector-drawer .el-drawer__body) {
  padding: 20px 0;
}
</style>
