import { defineStore } from 'pinia'
import { ref } from 'vue'

export type TabType = 'app' | 'web'

export interface Tab {
  id: string
  title: string
  type: TabType
  url?: string
  partition?: string // 隔离分区 ID
}

export const useTabsStore = defineStore('tabs', () => {
  // 当前激活的标签页 ID
  const activeTabId = ref('app_main')
  
  // 标签页列表，第一个始终是主应用
  const tabsList = ref<Tab[]>([
    { id: 'app_main', title: '主应用', type: 'app' }
  ])

  // 添加标签页
  const addTab = (tab: Tab) => {
    const isExist = tabsList.value.some((item) => item.id === tab.id)
    if (!isExist) {
      tabsList.value.push(tab)
    }
    activeTabId.value = tab.id
  }

  // 关闭标签页
  const closeTab = (id: string) => {
    if (id === 'app_main') return // 主应用不能关闭

    const index = tabsList.value.findIndex((item) => item.id === id)
    if (index !== -1) {
      tabsList.value.splice(index, 1)
      // 如果关闭的是当前激活的标签，则跳转到上一个标签
      if (activeTabId.value === id) {
        activeTabId.value = tabsList.value[tabsList.value.length - 1].id
      }
    }
  }

  return {
    activeTabId,
    tabsList,
    addTab,
    closeTab
  }
})
