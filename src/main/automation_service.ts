import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { app } from 'electron'
import { join } from 'path'
import type { Page, Browser } from 'puppeteer-core'

// 使用 Stealth 插件
puppeteer.use(StealthPlugin())

export class AutomationService {
  private activeBrowsers: Map<string, Browser> = new Map()
  private pageConfigs: Map<string, any> = new Map()
  private activePages: Map<string, Page> = new Map()
  
  // 消息去重集合 (accountId -> Set<messageId>)
  private processedMessages: Map<string, Set<string>> = new Map()
  // 自动化队列 (accountId -> Promise)
  private automationQueues: Map<string, Promise<void>> = new Map()

  /**
   * 更新页面的自动化配置
   */
  updatePageConfig(pageId: string, config: any) {
    console.log(`更新页面 ${pageId} 的配置:`, config)
    this.pageConfigs.set(pageId, config)
  }

  /**
   * 接管已存在的页面（如 WebView）并启动自动回复逻辑
   */
  async takeoverPage(page: Page, accountId: string) {
    console.log(`正在接管账号 ${accountId} 的页面进行自动化...`)
    this.activePages.set(`chat_settings_${accountId}`, page)

    // 监听 WSS
    await this.setupWssListener(page, accountId)
    console.log(`页面 ${accountId} 的 WSS 监听已启动`)
  }

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
  private async setupWssListener(page: Page, accountId: string) {
    const client = await page.target().createCDPSession()
    await client.send('Network.enable')

    client.on('Network.webSocketCreated', ({ url }) => {
      if (url.includes('frontier-im.douyin.com/ws/v2')) {
        console.log(`[WSS] 页面 ${accountId} 检测到目标 WSS 链接:`, url)
      }
    })

    client.on('Network.webSocketFrameReceived', async ({ response }) => {
      try {
        const payload = Buffer.from(response.payloadData, 'base64')

        // 1. 过滤心跳包 "hi"
        if (payload.toString('utf-8').trim() === 'hi') {
          return
        }

        // 2. 获取当前页面的最新配置
        const pageId = `chat_settings_${accountId}`
        const config = this.pageConfigs.get(pageId)
        if (!config || !config.enabled) {
          return
        }

        // 3. 解析消息
        const decoded = this.decodeRawProtobuf(payload)

        // 3. 提取字段并确保转换为字符串以防报错
        const messageType = String(this.findFieldPath(decoded, [8, 6, 500, 5, 2]) || '')
        const senderUid = String(this.findFieldPath(decoded, [8, 6, 500, 5, 7]) || '')
        // 获取发送者昵称和ID       
        const senderInfo = await this.getSenderName(senderUid)

        // 4. 判断消息类型是否为私信
        if (messageType === '1' && senderInfo.id !== accountId) {
          const messageId = String(this.findFieldPath(decoded, [11]) || '')
          
          // 4.1 消息去重
          if (this.isMessageProcessed(accountId, messageId)) {
            console.log(`[WSS] 消息 ${messageId} 已处理，跳过`)
            return
          }

          const chatContent = String(this.findFieldPath(decoded, [8, 6, 500, 5, 8]) || '')

          console.log(`[WSS Frame] 账号: ${accountId} | 消息ID: ${messageId} | 发送者UID: ${senderInfo.id} | 消息内容: ${chatContent}`)
          if (chatContent && chatContent.includes('aweType')) {
            // 匹配规则
            const isMatch = config.triggerRule === 'instant' ||
              (config.keywords && config.keywords.some(k => chatContent.includes(k)))

            if (isMatch) {
              console.log(`[Queue] 命中规则，加入自动化队列: ${config.replyContent}`)
              
              // 4.2 将自动化任务加入队列执行
              this.enqueueTask(accountId, async () => {
                console.log(`[RPA] 开始执行自动回复任务: ${senderInfo.name}`)
                // 点击发送者
                await this.clickSender(page, senderInfo.name)
                // 等待点击完成,延时1秒
                await new Promise(resolve => setTimeout(resolve, 1000));
                // 执行自动回复
                await this.performRpaReply(page, config.replyContent)
              })
            }
          }
        }
      } catch (err) {
        console.error(`[WSS] 页面 ${accountId} 解析失败:`, err)
      }
    })
  }


  /**
   * 将自动化任务加入队列并顺序执行
   */
  private async enqueueTask(accountId: string, task: () => Promise<void>) {
    // 获取当前账号的队列（即上一个任务的 Promise）
    const previousTask = this.automationQueues.get(accountId) || Promise.resolve()
    
    // 创建新任务
    const nextTask = previousTask.then(async () => {
      try {
        await task()
      } catch (err) {
        console.error(`[Queue] 账号 ${accountId} 任务执行失败:`, err)
      }
    })
    
    // 更新队列
    this.automationQueues.set(accountId, nextTask)
    
    // 防止内存泄漏：如果队列任务太多，Promise 链条会变长。
    // 但在典型的 RPA 场景中，回复速度通常比消息速度慢，
    // 如果消息积压严重，建议在此处加一些限流逻辑。
    return nextTask
  }

  /**
   * 判断消息是否已处理
   */
  private isMessageProcessed(accountId: string, messageId: string): boolean {
    if (!messageId || messageId === '0') return false
    
    if (!this.processedMessages.has(accountId)) {
      this.processedMessages.set(accountId, new Set())
    }
    
    const messageSet = this.processedMessages.get(accountId)!
    if (messageSet.has(messageId)) {
      return true
    }
    
    // 添加并限制集合大小，防止内存溢出（保留最近 1000 条消息 ID）
    messageSet.add(messageId)
    if (messageSet.size > 1000) {
      const firstValue = messageSet.values().next().value
      if (firstValue !== undefined) {
        messageSet.delete(firstValue)
      }
    }
    
    return false
  }

  /**
   * 根据发送者uid获取name和id
   * @param senderUid 发送者uid
   * @returns 发送者的name和id
   */
  private async getSenderName(senderUid: string) {
    //发送http请求
    const response = await fetch(`https://live.douyin.com/webcast/user/?aid=6383&target_uid=${senderUid}`, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return {
      name: String(data.data.nickname),
      id: String(data.data.short_id)
    }
  }

  /**
  * 最终终极版 Protobuf 原始解析
  * 保证：字符串/JSON/中文/消息ID/HEX二进制 全部正确显示
  */
  private decodeRawProtobuf(buffer: Buffer): any[] {
    const results: any[] = []
    let offset = 0

    while (offset < buffer.length) {
      try {
        let key = 0, shift = 0, b: number
        do {
          b = buffer[offset++]
          key |= (b & 0x7f) << shift
          shift += 7
        } while (b & 0x80)

        const wireType = key & 0x07
        const fieldNumber = key >> 3
        let value: any

        if (wireType === 0) {
          let val = 0n, s = 0n
          do {
            b = buffer[offset++]
            val |= BigInt(b & 0x7f) << s
            s += 7n
          } while (b & 0x80)
          value = val.toString()
        }
        else if (wireType === 1) {
          value = buffer.subarray(offset, offset + 8).toString('hex')
          offset += 8
        }
        // ==================== 核心修复：Length-delimited 终极策略 ====================
        else if (wireType === 2) {
          let len = 0, s = 0
          do {
            b = buffer[offset++]
            len |= (b & 0x7f) << s
            s += 7
          } while (b & 0x80)

          const data = buffer.subarray(offset, offset + len)
          offset += len

          // ==========================================
          // 【终极规则】直接尝试 UTF-8 解码
          // 只要不包含乱码、不可见字符，一律当字符串！
          // ==========================================
          const str = data.toString('utf8')
          if (this.isNormalText(str)) {
            value = str
          } else {
            // 只有真·二进制才尝试解析嵌套消息
            try {
              const nested = this.decodeRawProtobuf(data)
              value = nested.length > 0 ? { _isNested: true, fields: nested } : data.toString('hex')
            } catch {
              value = data.toString('hex')
            }
          }
        }
        else if (wireType === 5) {
          value = buffer.subarray(offset, offset + 4).toString('hex')
          offset += 4
        }
        else {
          break
        }

        results.push({ field: fieldNumber, type: wireType, value })
      } catch {
        break
      }
    }
    return results
  }

  /**
   * 判断是否是正常文本（英文、中文、数字、JSON、符号）
   * 99.9% 业务数据都会命中这里
   */
  private isNormalText(str: string): boolean {
    if (!str) return false
    // 包含：中文 + 可打印ASCII + 正常空白符 → 一律视为正常字符串
    return /^[\u4e00-\u9fa5\x20-\x7E\s\t\n\r]+$/.test(str)
  }

  /**
   * 递归查找指定路径的字段值
   * 例如: findFieldPath(decoded, [8, 13, 6])
   */
  private findFieldPath(fields: any[], path: number[]): any {
    if (!fields || !path || path.length === 0) return null

    const [currentFieldId, ...remainingPath] = path
    const targetField = fields.find(f => f.field === currentFieldId)

    if (!targetField) return null

    // 如果已经到达路径终点，返回当前字段的 value
    if (remainingPath.length === 0) {
      return targetField.value
    }

    // 如果还没到达终点，且当前字段是嵌套消息，则继续深入查找
    if (targetField.value && targetField.value._isNested) {
      return this.findFieldPath(targetField.value.fields, remainingPath)
    }

    return null
  }

  /**
   * 页面查找到当前消息的发送者并点击
   */
  private async clickSender(page: Page, senderName: string) {
    try {
      // 1. 找到所有带 title 的元素
      const elements = await page.$$('div.conversationConversationItemtitle');

      // 2. 遍历找到文本为「无尘工具」的元素
      for (const el of elements) {
        const text = await el.evaluate(node => node.textContent?.trim());
        if (text === senderName) {
          await el.click(); // 找到就点击
          break;
        }
      }

      // 3. 如果未找到匹配项，点击陌生人列表 div.conversationStrangerBoxtitle
      if (!elements.length) {
        await page.click('div.conversationStrangerBoxtitle')
        // 4. 等待陌生人列表加载完成
        await page.waitForSelector('div.conversationStrangerConversationListlistWrapper', { timeout: 5000 })
        // 5. 遍历找到文本为senderName的元素
        const strangerItems = await page.$$('div.conversationConversationItemtitle')
        for (const item of strangerItems) {
          const itemText = await item.evaluate(node => node.textContent?.trim());
          if (itemText === senderName) {
            await item.click(); // 找到就点击
            break;
          }
        }
      }
    } catch (error) {
      console.error(`点击发送者 ${senderName} 失败:`, error)
    }
  }



  /**
   * 手动发送指定话术
   */
  async sendManualScript(pageId: string, content: string) {
    const page = this.activePages.get(pageId)
    if (!page) {
      console.error(`未找到页面 ${pageId}，无法发送话术`)
      return
    }
    await this.performRpaReply(page, content)
  }

  /**
   * 执行 RPA 自动回复
   */
  private async performRpaReply(page: Page, content: string) {
    try {
      // 1. 等待并点击输入框 div[contenteditable='true']
      const inputSelector = 'div[contenteditable="true"]' // 这里需要替换为实际的选择器
      await page.waitForSelector(inputSelector, { timeout: 5000 })
      await page.click(inputSelector)

      // 2. 输入回复内容
      await page.keyboard.type(content, { delay: 100 })
      // 等待内容输入完成,延时1秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. 点击发送按钮svg.messageMsgInputpublishBtn
      const sendButtonSelector = 'svg.messageMsgInputpublishBtn' // 这里需要替换为实际的选择器
      await page.click(sendButtonSelector)

      // 4. 如果在陌生人列表，点击下返回按钮
      const isStrangerList = await page.evaluate(() => {
        const wrapper = document.querySelector('div.conversationConversationListwrapper');
        if (wrapper) {
          const style = window.getComputedStyle(wrapper);
          return style.opacity === '0';
        }
        return false;
      });

      if (isStrangerList) {
        console.log('[RPA] 检测到在陌生人列表，尝试点击返回按钮...');
        const backButtonSelector = 'div.conversationStrangerConversationListhead';
        await page.waitForSelector(backButtonSelector, { timeout: 3000 });
        await page.click(backButtonSelector);
        // 等待返回过渡完成
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('已执行 RPA 自动回复:', content)
    } catch (error) {
      console.error('执行 RPA 自动回复失败:', error)
    }
  }

  /**
   * 示例：使用 Stealth 环境访问并执行发布任务
   */
  async doDistributionTask(account: any, _videoData: any) {
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
