import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import type { Page, Browser } from 'puppeteer-core'

// 使用 Stealth 插件
puppeteer.use(StealthPlugin())

export class AutomationService {
  private activeBrowsers: Map<string, Browser> = new Map()

  /**
   * 启动一个带有 Stealth 插件的浏览器实例
   */
  async launchStealthBrowser(partitionId: string) {
    const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    const userDataDir = join(app.getPath('userData'), 'automation', partitionId)

    const browser = await (puppeteer as any).launch({
      executablePath,
      headless: false,
      userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized'
      ],
      defaultViewport: null
    })

    return browser
  }

  /**
   * 启动自动回复策略
   */
  async startAutoReply(policy: any) {
    console.log('启动自动回复策略:', policy.name)
    
    for (const account of policy.selectedAccounts) {
      try {
        const browser = await this.launchStealthBrowser(account.id)
        this.activeBrowsers.set(account.id, browser)

        const page = await browser.newPage()
        
        // 1. 访问抖音聊天页面
        await page.goto('https://www.douyin.com/chat?isPopup=1', {
          waitUntil: 'networkidle2'
        })

        // 2. 监听 WSS 链接
        await this.setupWssListener(page, policy)

        console.log(`账号 ${account.nickname} 已启动自动回复监控`)
      } catch (error) {
        console.error(`启动账号 ${account.nickname} 失败:`, error)
      }
    }
  }

  /**
   * 设置 WSS 监听器
   */
  private async setupWssListener(page: Page, policy: any) {
    const client = await page.target().createCDPSession()
    await client.send('Network.enable')

    client.on('Network.webSocketCreated', ({ url }) => {
      if (url.includes('frontier-im.douyin.com/ws/v2')) {
        console.log('检测到目标 WSS 链接:', url)
      }
    })

    client.on('Network.webSocketFrameReceived', async ({ response }) => {
      // 这里处理接收到的消息帧
      // 注意：抖音的消息通常是 Protobuf 格式，需要解析
      // 这里的逻辑需要根据实际的消息格式进行调整
      try {
        // 示例：检测到新消息时触发 RPA
        // const message = parseProtobuf(response.payloadData)
        // if (shouldReply(message, policy)) {
        //   await this.performRpaReply(page, '自动回复内容')
        // }
        console.log('收到 WSS 消息帧')
      } catch (err) {
        console.error('解析 WSS 消息失败:', err)
      }
    })
  }

  /**
   * 执行 RPA 自动回复
   */
  private async performRpaReply(page: Page, content: string) {
    try {
      // 1. 等待并点击输入框
      const inputSelector = '.chat-input' // 这里需要替换为实际的选择器
      await page.waitForSelector(inputSelector)
      await page.click(inputSelector)

      // 2. 输入回复内容
      await page.keyboard.type(content)

      // 3. 点击发送按钮
      const sendButtonSelector = '.send-btn' // 这里需要替换为实际的选择器
      await page.click(sendButtonSelector)
      
      console.log('已执行 RPA 自动回复:', content)
    } catch (error) {
      console.error('执行 RPA 自动回复失败:', error)
    }
  }

  /**
   * 示例：使用 Stealth 环境访问并执行发布任务
   */
  async doDistributionTask(account: any, videoData: any) {
    const browser = await this.launchStealthBrowser(account.id)
    const page = await browser.newPage()

    // 设置 Cookie
    if (account.cookies) {
      await page.setCookie(...account.cookies)
    }

    // 访问发布页面
    await page.goto('https://www.douyin.com/creator-center/content/publish-video/upload', {
      waitUntil: 'networkidle2'
    })

    // 在此处执行自动化点击、上传视频等逻辑...
    console.log('自动化发布任务启动...')
    
    // 任务完成后可以关闭浏览器
    // await browser.close()
  }
}

export const automationService = new AutomationService()
