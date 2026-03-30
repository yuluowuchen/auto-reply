import Store from 'electron-store'
import { ipcMain } from 'electron'

const StoreClass = typeof Store === 'function' ? Store : (Store as any).default
const store = new StoreClass()

export interface AutoReplyPolicy {
  id: string
  name: string
  triggerRule: 'keyword' | 'instant'
  keywords: string[]
  selectedAccounts: any[]
  triggerUser: 'all' | 'custom'
  scripts: any[]
  stopCondition: string
  stopHours: number
  enabled: boolean
  createdAt: number
}

export function setupPolicyManager() {
  // 获取所有策略
  ipcMain.handle('get-policies', () => {
    return store.get('policies', [])
  })

  // 保存策略
  ipcMain.handle('save-policy', (_, policy: AutoReplyPolicy) => {
    const policies = store.get('policies', []) as AutoReplyPolicy[]
    const index = policies.findIndex((p) => p.id === policy.id)
    
    if (index !== -1) {
      policies[index] = policy
    } else {
      policy.id = policy.id || Date.now().toString()
      policy.createdAt = policy.createdAt || Date.now()
      policies.push(policy)
    }
    
    store.set('policies', policies)
    return policies
  })

  // 删除策略
  ipcMain.handle('delete-policy', (_, id: string) => {
    const policies = store.get('policies', []) as AutoReplyPolicy[]
    const updated = policies.filter((p) => p.id !== id)
    store.set('policies', updated)
    return updated
  })
}
