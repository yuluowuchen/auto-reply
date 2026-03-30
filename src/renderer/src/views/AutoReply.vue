<template>
  <div class="auto-reply-container">
    <!-- 顶部面包屑/标题栏 -->
    <div class="header-nav">
      <el-button link :icon="Back" @click="goBack" class="back-btn" />
      <el-divider direction="vertical" />
      <span class="title">抖音-私信自动回复</span>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" class="create-btn" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建策略
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="table-wrapper">
      <el-table :data="tableData" style="width: 100%" class="custom-table">
        <el-table-column prop="name" label="策略名称" />
        <el-table-column label="触发规则">
          <template #default="scope">
            {{ scope.row.triggerRule === 'keyword' ? '关键字匹配' : '即刻回复' }}
          </template>
        </el-table-column>
        <el-table-column label="关联账号数" align="center">
          <template #default="scope">
            {{ scope.row.selectedAccounts?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.enabled ? 'success' : 'info'">
              {{ scope.row.enabled ? '已启用' : '已关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
        
        <!-- 空数据状态插槽 -->
        <template #empty>
          <div class="empty-state">
            <el-empty :image-size="200" description="暂无数据" />
          </div>
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Back, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const tableData = ref<any[]>([])

const fetchPolicies = async () => {
  try {
    tableData.value = await window.api.getPolicies()
  } catch (error) {
    console.error('获取策略失败:', error)
  }
}

onMounted(() => {
  fetchPolicies()
})

const goBack = () => {
  router.push('/features')
}

const handleCreate = () => {
  router.push('/create-auto-reply')
}

const handleEdit = (row: any) => {
  // 目前先跳转到创建页，实际可以带上 ID 进行编辑
  router.push({
    path: '/create-auto-reply',
    query: { id: row.id }
  })
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除策略 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await window.api.deletePolicy(row.id)
      ElMessage.success('删除成功')
      fetchPolicies()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}
</script>

<style scoped>
.auto-reply-container {
  padding: 20px;
  background-color: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-nav {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  font-size: 16px;
  color: #303133;
}

.back-btn {
  font-size: 20px;
  color: #303133;
}

.title {
  font-weight: 500;
  margin-left: 8px;
}

.action-bar {
  margin-bottom: 20px;
}

.create-btn {
  background-color: #1d1d1f;
  border-color: #1d1d1f;
  border-radius: 6px;
  padding: 8px 16px;
}

.create-btn:hover {
  background-color: #333;
  border-color: #333;
}

.table-wrapper {
  flex: 1;
}

.custom-table :deep(.el-table__header) {
  background-color: #f5f7fa;
}

.custom-table :deep(th.el-table__cell) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 500;
}

.empty-state {
  padding: 60px 0;
}
</style>
