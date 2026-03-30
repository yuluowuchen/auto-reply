import { contextBridge, ipcRenderer, webFrame } from 'electron'

// 实现类似 @electron-toolkit/preload 的功能，避免直接依赖导致沙盒报错
const electronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    sendSync: (channel: string, ...args: any[]) => ipcRenderer.sendSync(channel, ...args),
    sendToHost: (channel: string, ...args: any[]) => ipcRenderer.sendToHost(channel, ...args),
    postMessage: (channel: string, message: any, transfer?: MessagePort[]) =>
      ipcRenderer.postMessage(channel, message, transfer),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (event: any, ...args: any[]) => void) =>
      ipcRenderer.on(channel, listener),
    once: (channel: string, listener: (event: any, ...args: any[]) => void) =>
      ipcRenderer.once(channel, listener),
    removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) =>
      ipcRenderer.removeListener(channel, listener),
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
  },
  webFrame: {
    insertCSS: (css: string) => webFrame.insertCSS(css),
    setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
    setZoomLevel: (level: number) => webFrame.setZoomLevel(level)
  },
  process: {
    get platform() {
      return process.platform
    },
    get versions() {
      return process.versions
    },
    get env() {
      return process.env
    }
  }
}

// Custom APIs for renderer
const api = {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  deleteAccount: (id: string) => ipcRenderer.invoke('delete-account', id),
  saveAccount: (data: any) => ipcRenderer.invoke('save-account', data),
  clearPartition: (partition: string) => ipcRenderer.invoke('clear-partition', partition),
  startAutoReply: (policy: any) => ipcRenderer.invoke('start-auto-reply', policy),
  getPolicies: () => ipcRenderer.invoke('get-policies'),
  savePolicy: (policy: any) => ipcRenderer.invoke('save-policy', policy),
  deletePolicy: (id: string) => ipcRenderer.invoke('delete-policy', id),
  updateAutoReplyConfig: (pageId: string, config: any) => ipcRenderer.invoke('update-auto-reply-config', { pageId, config }),
  sendManualScript: (pageId: string, content: string) => ipcRenderer.invoke('send-manual-script', { pageId, content }),
  onDouyinLoginSuccess: (callback: any) =>
    ipcRenderer.on('douyin-login-success', (_, data) => callback(data)),

  // 验证相关 API
  verify: {
    init: () => ipcRenderer.invoke('verify-init'),
    login: (data: any) => ipcRenderer.invoke('verify-login', data),
    register: (data: any) => ipcRenderer.invoke('verify-register', data),
    getUserInfo: () => ipcRenderer.invoke('verify-get-user-info'),
    refreshToken: () => ipcRenderer.invoke('verify-refresh-token'),
    recharge: (data: any) => ipcRenderer.invoke('verify-recharge', data),
    unbind: (data: any) => ipcRenderer.invoke('verify-unbind', data),
    getNotice: () => ipcRenderer.invoke('verify-get-notice'),
    getAppInfo: () => ipcRenderer.invoke('verify-get-app-info'),
    getAppUserInfo: () => ipcRenderer.invoke('verify-get-app-user-info'),
    getVipTime: () => ipcRenderer.invoke('verify-get-vip-time'),
    getUserRmb: () => ipcRenderer.invoke('verify-get-user-rmb'),
    getVipNumber: () => ipcRenderer.invoke('verify-get-vip-number'),
    logout: () => ipcRenderer.invoke('verify-logout'),
    checkLogin: () => ipcRenderer.invoke('verify-check-login'),
    checkUpdate: () => ipcRenderer.invoke('verify-check-update'),
    getAppUpdateJson: () => ipcRenderer.invoke('verify-get-app-update-json'),
    payKaUsa: (data: any) => ipcRenderer.invoke('verify-pay-ka-usa', data)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
