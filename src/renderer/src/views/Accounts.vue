<template>
  <div class="accounts-container">
    <div class="header">
      <h2>账号管理</h2>
      <el-button type="primary" @click="handleAddAccount">
        <el-icon><Plus /></el-icon>添加抖音账号
      </el-button>
    </div>

    <div v-if="accounts.length === 0" class="empty-state">
      <el-empty description="暂无账号，请点击上方按钮添加" />
    </div>

    <div v-else class="account-list">
      <el-card
        v-for="account in accounts"
        :key="account.id"
        class="account-card"
        @click="handleOpenAccount(account)"
      >
        <div class="account-info">
          <el-avatar :size="50" :src="account.avatar || defaultAvatar" />
          <div class="details">
            <div class="nickname">{{ account.nickname }}</div>
            <div class="platform">
              平台: {{ account.platform === 'douyin' ? '抖音' : account.platform }}
            </div>
          </div>
        </div>
        <div class="actions">
          <el-button type="danger" size="small" @click.stop="handleDelete(account.id)">
            删除
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTabsStore } from '../store/tabs'

const tabsStore = useTabsStore()

interface Account {
  id: string
  platform: 'douyin'
  nickname: string
  avatar: string
  partition: string
}

const accounts = ref<Account[]>([])
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// 获取账号列表
const fetchAccounts = async () => {
  accounts.value = await window.api.getAccounts()
}

// 添加账号标签页
const handleAddAccount = async () => {
  // 检查是否已经有登录标签页正在打开，防止重复开启多个登录窗口
  const existingLoginTab = tabsStore.tabsList.find(tab => tab.id.startsWith('login_douyin_'))
  if (existingLoginTab) {
    tabsStore.activeTabId = existingLoginTab.id
    ElMessage.warning('已有正在进行的登录任务，请先完成或关闭它')
    return
  }

  // 每次登录使用唯一的 ID，确保账号分区独立
  const id = Date.now().toString()
  // const partition = `persist:douyin_login_${id}`
  // 使用一个临时的、不保存数据的 partition
    const tempPartition = 'temp_login_session'; 

  tabsStore.addTab({
    id: `login_douyin_${id}`,
    title: '抖音登录',
    type: 'web',
    url: 'https://creator.douyin.com/creator-micro/home',
    partition: tempPartition
  })
  ElMessage.info('已在上方标签页打开登录页面')
}

// 打开账号对应网址标签页
const handleOpenAccount = (account: Account) => {
  tabsStore.addTab({
    id: `account_${account.id}`,
    title: `${account.nickname} - 抖音`,
    type: 'web',
    url: 'https://creator.douyin.com/creator-micro/home',
    partition: `${account.partition}`
  })
}

// 删除账号
const handleDelete = (id: string) => {
  ElMessageBox.confirm('确定要删除该账号吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    accounts.value = await window.api.deleteAccount(id)
    ElMessage.success('账号已删除')
  })
}

onMounted(() => {
  fetchAccounts()

  // 监听登录成功事件，刷新列表
  window.api.onDouyinLoginSuccess(() => {
    fetchAccounts()
  })
})
</script>

<style scoped>
.accounts-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.account-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.account-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.account-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.account-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.details .nickname {
  font-size: 16px;
  font-weight: bold;
}

.details .platform {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}

.empty-state {
  margin-top: 100px;
}
</style>
