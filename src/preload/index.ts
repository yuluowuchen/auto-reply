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
  onDouyinLoginSuccess: (callback: any) =>
    ipcRenderer.on('douyin-login-success', (_, data) => callback(data))
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
