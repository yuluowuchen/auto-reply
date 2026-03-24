<template>
  <div class="account-selector">
    <div class="selector-header">
      <h3>选择账号</h3>
      <div class="header-actions">
        <el-checkbox
          v-model="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          全选
        </el-checkbox>
      </div>
    </div>

    <div class="account-list" v-loading="loading">
      <el-scrollbar height="calc(100vh - 180px)">
        <div
          v-for="account in allAccounts"
          :key="account.id"
          class="account-item"
          :class="{ 'is-selected': selectedIds.includes(account.id) }"
          @click="toggleSelect(account)"
        >
          <el-checkbox
            :model-value="selectedIds.includes(account.id)"
            @click.stop
            @change="toggleSelect(account)"
          />
          <el-avatar :size="32" :src="account.avatar || defaultAvatar" class="avatar" />
          <div class="info">
            <div class="nickname">{{ account.nickname }}</div>
            <div class="platform">抖音</div>
          </div>
        </div>
        <el-empty v-if="!loading && allAccounts.length === 0" description="暂无账号" />
      </el-scrollbar>
    </div>

    <div class="selector-footer">
      <el-button @click="$emit('cancel')">取消</el-button>
      <el-button type="primary" @click="confirmSelection">
        确定 ({{ selectedIds.length }})
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Account {
  id: string
  platform: 'douyin'
  nickname: string
  avatar: string
  partition: string
}

const props = defineProps<{
  initialSelectedIds: string[]
}>()

const emit = defineEmits<{
  (e: 'confirm', selectedAccounts: Account[]): void
  (e: 'cancel'): void
}>()

const loading = ref(false)
const allAccounts = ref<Account[]>([])
const selectedIds = ref<string[]>([...props.initialSelectedIds])
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const isAllSelected = computed(() => {
  return allAccounts.value.length > 0 && selectedIds.value.length === allAccounts.value.length
})

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < allAccounts.value.length
})

const fetchAccounts = async () => {
  loading.value = true
  try {
    allAccounts.value = await window.api.getAccounts()
  } catch (err) {
    console.error('获取账号失败:', err)
  } finally {
    loading.value = false
  }
}

const toggleSelect = (account: Account) => {
  const index = selectedIds.value.indexOf(account.id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(account.id)
  }
}

const handleSelectAll = (val: boolean) => {
  selectedIds.value = val ? allAccounts.value.map(a => a.id) : []
}

const confirmSelection = () => {
  const selected = allAccounts.value.filter(a => selectedIds.value.includes(a.id))
  emit('confirm', selected)
}

onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.account-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 20px;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.selector-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.account-list {
  flex: 1;
  margin: 0 -20px;
}

.account-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f5f5f7;
}

.account-item:hover {
  background-color: #f5f7fa;
}

.account-item.is-selected {
  background-color: #f0f7ff;
}

.avatar {
  margin: 0 12px;
}

.info {
  flex: 1;
}

.nickname {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
}

.platform {
  font-size: 12px;
  color: #86868b;
  margin-top: 2px;
}

.selector-footer {
  padding: 20px 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #f0f0f0;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #2b57f1;
  border-color: #2b57f1;
}
</style>
