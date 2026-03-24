import { ElectronAPI } from '@electron-toolkit/preload'

interface Account {
  id: string
  platform: 'douyin'
  nickname: string
  avatar: string
  partition: string
}

interface CustomAPI {
  getAccounts: () => Promise<Account[]>
  deleteAccount: (id: string) => Promise<Account[]>
  saveAccount: (data: { id: string; platform: 'douyin'; nickname: string; avatar: string; partition: string }) => Promise<Account>
  clearPartition: (partition: string) => Promise<boolean>
  startAutoReply: (policy: any) => Promise<void>
  onDouyinLoginSuccess: (callback: (data: { id: string; nickname: string; avatar: string }) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
