import { app, session, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupAccountManager, saveAccount, Account } from './account_manager'
import { setupPolicyManager } from './policy_manager'
import { setupVerifyManager } from './verify_manager'
import Verify from './feiniao-api/verify'
import { automationService } from './automation_service'

// ✅ 引入 Puppeteer Stealth 相关依赖
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Browser, Page } from 'puppeteer-core'

// 加载 Stealth 插件（核心：启用所有反检测策略）
puppeteer.use(StealthPlugin())

// --- 全局配置 ---
const REMOTE_DEBUG_PORT = 9222
const CUSTOM_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
let electronPuppeteerBrowser: Browser | null = null

// --- 启动参数配置 ---
// 1. 开启远程调试端口，这是 Puppeteer 接管 Electron 的关键
app.commandLine.appendSwitch('remote-debugging-port', REMOTE_DEBUG_PORT.toString())
// 2. 禁用自动化受控特征，防止被网站识别
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')

// --- 全局状态 ---
const monitoringPages = new WeakSet<Page>()

/**
 * 监控抖音页面元素，利用 Puppeteer 原生 API 持续抓取账号信息
 */
async function monitorDouyinAccount(page: Page) {
  if (monitoringPages.has(page)) return
  monitoringPages.add(page)

  try {
    console.log('⏳ Puppeteer 正在后台持续监控抖音登录状态...')
    
    // ✅ 核心改进：使用 waitForFunction 开启持续轮询
    // 它会一直运行，直到返回 true（即三个核心元素同时出现）
    await page.waitForFunction(() => {
      const nameEl = document.querySelector('div.name-_lSSDc')
      const avatarEl = document.querySelector('img.img-PeynF_')
      const idEl = document.querySelector('div.unique_id-EuH8eA')
      return nameEl && avatarEl && idEl
    }, {
      timeout: 0,           // 0 表示无限等待，直到用户完成登录并进入主页
      polling: 'mutation'   // 使用浏览器原生的 MutationObserver，比定时器轮询更省性能
    })
    
    // 一旦元素出现，立即提取数据
    const userData = await page.evaluate(() => {
      const nameEl = document.querySelector('div.name-_lSSDc') as HTMLElement
      const avatarEl = document.querySelector('img.img-PeynF_') as HTMLImageElement
      const idEl = document.querySelector('div.unique_id-EuH8eA') as HTMLElement

      return {
        id: idEl.innerText.trim().replace('抖音号：', '').replace('ID：', ''),
        nickname: nameEl.innerText.trim(),
        avatar: avatarEl.src
      }
    })

    if (userData && !page.isClosed()) {
      console.log('✅ Puppeteer 成功捕获到登录信息:', userData)

      //本地保存cookie到sessionStorage的方法
      const cookies = await page.cookies()
      const ses = session.fromPartition(`persist:douyin_login_${userData.id}`)      
      // 遍历所有 cookie 并设置到指定的 session 中
      for (const cookie of cookies) {
        // 构建 cookie 所需的 URL
        const protocol = cookie.secure ? 'https' : 'http'
        const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain
        const url = `${protocol}://${domain}${cookie.path}`

        try {
          await ses.cookies.set({
            url: url,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expires,
            sameSite: (function() {
              const ss = (cookie.sameSite || 'unspecified').toLowerCase()
              if (ss === 'none') return 'no_restriction'
              if (['lax', 'strict', 'unspecified', 'no_restriction'].includes(ss)) return ss as any
              return 'unspecified'
            })()
          })
        } catch (err) {
          console.error(`❌ 设置 Cookie 失败: ${cookie.name}`, err)
        }
      }      
      // 直接在后端保存账号信息
      const accountInfo: Account = {
        id: userData.id,
        platform: 'douyin',
        nickname: userData.nickname,
        avatar: userData.avatar,
        partition: `persist:douyin_login_${userData.id}`
      }      
      await saveAccount(accountInfo)
      console.log('💾 账号信息已直接在后端保存' , accountInfo)

      // 通知前端登录成功（可选，如果前端还需要根据此事件做其他 UI 更新）
      const allWindows = BrowserWindow.getAllWindows()
      allWindows.forEach(win => {
        win.webContents.send('douyin-login-success', userData)
      })
  
    }
  } catch (error) {
    // 只有在页面被关闭或导航导致监控中断时才会进入这里
    // console.log('ℹ️ 抖音监控任务已结束')
  } finally {
    monitoringPages.delete(page)
  }
}

/**
 * 初始化 Puppeteer 并连接到 Electron 内部 Chromium
 */
async function initPuppeteer() {
  if (electronPuppeteerBrowser) return electronPuppeteerBrowser

  try {
    // 通过 CDP 协议连接到当前运行的 Electron 实例
    electronPuppeteerBrowser = (await puppeteer.connect({
      browserURL: `http://127.0.0.1:${REMOTE_DEBUG_PORT}`,
      defaultViewport: null
    })) as unknown as Browser

    // ✅ 核心：自动接管所有新创建的窗口和 Webview
    electronPuppeteerBrowser.on('targetcreated', async (target) => {
      const type = target.type()
      if (type !== 'page' && type !== 'webview') return

      try {
        const page = await target.page()
        if (!page) return

        // 🛡️ 注入 Stealth UA (非阻塞)
        page.setUserAgent(CUSTOM_USER_AGENT).catch(() => {})
        // const userAgent = await target.browser() 

        
        console.log(`🛡️ Puppeteer 已接管新 ${type}`)

        // 如果访问的是抖音域名，则开启账号监控逻辑
        page.on('load', () => {
          const url = page.url()
          if (url.includes('creator.douyin.com')) {
            monitorDouyinAccount(page)
          }
          // 检测到聊天页面，执行接管逻辑
          if (url.includes('www.douyin.com/chat')) {
            // 💡 方案一：通过 URL 参数直接获取 accountId (最稳健)
            const accountId = new URL(url).searchParams.get('accountId') || 'unknown'
            
            // 💡 方案二：通过 targetId 桥接到 Electron 的 WebContents (深度接管)
            // const targetId = (target as any)._targetId
            // const wc = webContents.fromDevToolsTargetId(targetId)
            // if (wc) {
            //   console.log(`🚀 成功桥接到 WebContents, 分区: ${wc.session.getStoragePath()}`)
            // }
            
            automationService.takeoverPage(page, accountId)
          }
        })

        // 初始页面加载时也要检查 (防止 targetcreated 在 load 之后触发)
        const currentUrl = page.url()
        if (currentUrl.includes('creator.douyin.com')) {
          monitorDouyinAccount(page)
        }
        if (currentUrl.includes('www.douyin.com/chat')) {
          const accountId = new URL(currentUrl).searchParams.get('accountId') || 'unknown'
          automationService.takeoverPage(page, accountId)
        }

      } catch (err) {
        console.error('❌ 处理新 Target 时出错:', err)
      }
    })

    console.log('✅ Puppeteer Stealth 已全局就绪，所有窗口已被监控')
    return electronPuppeteerBrowser
  } catch (error) {
    console.error('❌ Puppeteer 连接失败，1秒后重试:', (error as Error).message)
    setTimeout(initPuppeteer, 1000)
    return null
  }
}

/**
 * 创建主应用窗口
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false, // 安全最佳实践：禁用Node集成
      contextIsolation: true, // 开启上下文隔离
      sandbox: true, // 可选：启用沙箱增强安全性
      webviewTag: true // 允许使用 webview 标签
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 开发环境加载渲染进程 URL
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- App 生命周期管理 ---

app.whenReady().then(() => {
  // ✅ 统一设置所有请求的 User-Agent，移除 Electron 指纹
  const applyGlobalUA = (ses: Electron.Session) => {
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = CUSTOM_USER_AGENT
      callback({ requestHeaders: details.requestHeaders })
    })
  }

  applyGlobalUA(session.defaultSession)
  app.on('session-created', (newSession) => applyGlobalUA(newSession))

  // 设置应用模型 ID (Windows)
  electronApp.setAppUserModelId('com.electron')

  // 基础快捷键和 IPC 处理器注册
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 自动化发布 IPC 处理器
  ipcMain.handle('start-automation', async (_, data) => {
    return automationService.doDistributionTask(data.account, data.videoData)
  })

  // 自动回复策略 IPC 处理器
  ipcMain.handle('start-auto-reply', async (_, policy) => {
    return automationService.startAutoReply(policy)
  })

  // 更新自动化配置
  ipcMain.handle('update-auto-reply-config', (_, { pageId, config }) => {
    return automationService.updatePageConfig(pageId, config)
  })

  // 手动发送话术
  ipcMain.handle('send-manual-script', async (_, { pageId, content }) => {
    return automationService.sendManualScript(pageId, content)
  })

  // 清理分区数据(没啥用，起不到作用可以删除)
  ipcMain.handle('clear-partition', async (_, partition: string) => {
    if (!partition) return
    const ses = session.fromPartition(partition)
    await ses.clearStorageData()
    return true
  })

  // 打开外部链接
  ipcMain.on('open-external', (_, url: string) => {
    shell.openExternal(url)
  })

  // 在程序内部新窗口打开链接 (常用于支付页面)
  ipcMain.on('open-internal-window', (_, url: string) => {
    const payWin = new BrowserWindow({
      width: 1000,
      height: 800,
      // title: '账户充值',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })
    payWin.loadURL(url)
  })

  // 初始化验证管理器
  setupVerifyManager()

  // 初始化账号管理器
  setupAccountManager()
  
  // 初始化策略管理器
  setupPolicyManager()

  // 自动更新检查
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  // 初始化验证系统 (获取 Token)
  Verify.init().then((res) => {
    if (res.success) {
      console.log('✅ 验证系统初始化成功')
    } else {
      console.error('❌ 验证系统初始化失败:', res.error)
    }
    // 获取 Token 后创建窗口并跳转到登录页面 (路由已配置默认跳转 /login)
    createWindow()
    setTimeout(initPuppeteer, 2000)
  }).catch(err => {
    console.error('❌ 验证系统初始化异常:', err)
    createWindow() // 即使失败也尝试开启窗口，由前端显示错误
    setTimeout(initPuppeteer, 2000)
  })

  // Webview 安全策略配置
  app.on('web-contents-created', (_, contents) => {
    if (contents.getType() === 'webview') {
      // 拦截非 http/https 协议请求，防止拉起本地应用（如 抖音/QQ 等）
      contents.setWindowOpenHandler((details) => {
        const isHttp = /^https?:\/\//i.test(details.url)
        if (!isHttp) {
          console.warn('⚠️ 拦截到非 HTTP(S) 新窗口请求:', details.url)
          return { action: 'deny' }
        }
        console.log('✅ 允许新窗口打开:', details.url)
        return { action: 'allow' }
      })

      contents.on('will-navigate', (event, url) => {
        const isHttp = /^https?:\/\//i.test(url)
        if (!isHttp) {
          event.preventDefault()
          console.warn('🚫 拦截到非 HTTP(S) 导航请求:', url)
        }
      })

      // 同样处理 frame 内的导航（这个生效了）
      contents.on('will-frame-navigate', (event) => {
        const url = event.url
        const isHttp = /^https?:\/\//i.test(url)
        if (!isHttp) {
          event.preventDefault()
          console.warn('🚫 拦截到 Frame 内非 HTTP(S) 导航请求:', url)
        }
      })
      
      // 基础注入（补充 Stealth 逻辑）
      contents.on('dom-ready', () => {
        contents.executeJavaScript(`
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          window.chrome = { runtime: {} };
        `).catch(console.error)
      })
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 窗口全部关闭后退出程序（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
