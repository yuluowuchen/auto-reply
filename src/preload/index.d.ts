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
  getPolicies: () => Promise<any[]>
  savePolicy: (policy: any) => Promise<any[]>
  deletePolicy: (id: string) => Promise<any[]>
  updateAutoReplyConfig: (pageId: string, config: any) => Promise<void>
  sendManualScript: (pageId: string, content: string) => Promise<void>
  onDouyinLoginSuccess: (callback: (data: { id: string; nickname: string; avatar: string }) => void) => void
  verify: {
    init: () => Promise<any>
    login: (data: any) => Promise<any>
    register: (data: any) => Promise<any>
    getUserInfo: () => Promise<any>
    refreshToken: () => Promise<any>
    recharge: (data: any) => Promise<any>
    unbind: (data: any) => Promise<any>
    getNotice: () => Promise<any>
    getAppInfo: () => Promise<any>
    getAppUserInfo: () => Promise<any>
    getVipTime: () => Promise<any>
    getUserRmb: () => Promise<any>
    getVipNumber: () => Promise<any>
    getAppUpdateJson: () => Promise<any>
    logout: () => Promise<any>
    checkLogin: () => Promise<any>
    checkUpdate: () => Promise<any>
    payKaUsa: (data: { user: string; kaClassId: number; payType: string }) => Promise<any>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
