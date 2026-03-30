import { ipcMain } from 'electron'
import Store from 'electron-store'

// 解决 electron-store 在某些环境下导入为对象的问题
const StoreClass = typeof Store === 'function' ? Store : (Store as any).default
const store = new StoreClass()

export interface Account {
  id: string
  platform: 'douyin'
  nickname: string
  avatar: string
  partition: string
}

/**
 * 保存账号信息的本地方法 (供主进程直接调用)
 */
export async function saveAccount(data: Account) {
  const accounts = store.get('accounts', []) as Account[]
  // 检查是否已存在同 ID 账号，存在则更新
  const index = accounts.findIndex((a) => a.id === data.id)
  if (index !== -1) {
    accounts[index] = data
  } else {
    accounts.push(data)
  }

  store.set('accounts', accounts)
  return data
}

export function setupAccountManager() {
  // 获取所有账号
  ipcMain.handle('get-accounts', () => {
    return store.get('accounts', [])
  })

  // 删除账号
  ipcMain.handle('delete-account', (_, id: string) => {
    const accounts = store.get('accounts', []) as Account[]
    const updatedAccounts = accounts.filter((acc) => acc.id !== id)
    store.set('accounts', updatedAccounts)
    return updatedAccounts
  })

  // 保存账号信息 (供渲染进程调用)
  ipcMain.handle(
    'save-account',
    async (_, data: { id: string; nickname: string; avatar: string; partition: string }) => {
      // const ses = session.fromPartition(data.partition)
      // const cookies = await ses.cookies.get({})

      const accountInfo: Account = {
        id: data.id,
        platform: 'douyin',
        nickname: data.nickname,
        avatar: data.avatar,
        partition: data.partition
      }

      return await saveAccount(accountInfo)
    }
  )

  // 开启调试器拦截网络请求
  // ipcMain.on('start-intercept', (_event, { partition }) 
}
