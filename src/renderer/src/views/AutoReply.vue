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
        <el-table-column prop="rule" label="触发规则" />
        <el-table-column prop="accountCount" label="关联数" align="center" />
        <el-table-column prop="replyCount" label="回复数" align="center" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button link type="primary">编辑</el-button>
            <el-button link type="danger">删除</el-button>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Back, Plus } from '@element-plus/icons-vue'

const router = useRouter()
const tableData = ref([])

const goBack = () => {
  router.push('/features')
}

const handleCreate = () => {
  router.push('/create-auto-reply')
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
