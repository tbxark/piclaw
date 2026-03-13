import type { EventMessage, TextMessage, WsFrame } from '@wecom/aibot-node-sdk'
import type { ErrorHandler, IAdapter, MessageHandler, SendOptions, SentMessage, UnifiedMessage } from '../types.js'
import { generateReqId, WSClient } from '@wecom/aibot-node-sdk'
import { logger } from '../logger/index.js'

interface PendingReply {
  frame: WsFrame<TextMessage>
  streamId: string
}

export class WeComAdapter implements IAdapter {
  private wsClient: WSClient | null = null
  private messageHandlers: MessageHandler[] = []
  private errorHandlers: ErrorHandler[] = []
  private running = false

  // Store pending reply frames for each user
  private pendingReplies = new Map<string, PendingReply>()

  constructor(
    private botId: string,
    private secret: string,
  ) {}

  async start(): Promise<void> {
    if (!this.botId || !this.secret) {
      logger.info('WeCom adapter disabled: no botId or secret provided')
      return
    }

    logger.warn('WeCom adapter starting...')

    if (this.running)
      return

    this.wsClient = new WSClient({
      botId: this.botId,
      secret: this.secret,
      logger: {
        debug: () => {}, // 静默 debug
        info: (message, ...args) => logger.info(`[AiBotSDK] ${message}`, ...args),
        warn: (message, ...args) => logger.warn(`[AiBotSDK] ${message}`, ...args),
        error: (message, ...args) => logger.error(`[AiBotSDK] ${message}`, ...args),
      },
    })

    this.wsClient.on('authenticated', () => {
      logger.info('WeCom adapter: authenticated successfully')
    })

    this.wsClient.on('disconnected', (reason: string) => {
      logger.info(`WeCom adapter: connection closed (${reason})`)
      this.running = false
    })

    this.wsClient.on('error', (error: Error) => {
      logger.error('WeCom adapter error:', error)
      for (const handler of this.errorHandlers) {
        handler(error)
      }
    })

    // Listen for text messages
    this.wsClient.on('message.text', async (frame: WsFrame<TextMessage>) => {
      const body = frame.body
      if (!body || !body.text?.content)
        return

      // Debug: output raw message format
      logger.debug({ raw: body }, 'WeCom raw message')

      const chatId = body.msgid
      const userId = body.from.userid

      const unifiedMsg: UnifiedMessage = {
        id: `wecom-${body.msgid}`,
        chatId,
        userId,
        text: body.text.content,
        timestamp: Date.now(),
      }

      // Generate streamId and save pending reply frame (don't send "thinking" immediately, handled by sendMessage)
      const streamId = generateReqId('stream')
      this.pendingReplies.set(chatId, { frame, streamId })

      try {
        for (const handler of this.messageHandlers) {
          await handler(unifiedMsg)
        }
      }
      catch (error) {
        for (const errHandler of this.errorHandlers) {
          errHandler(error as Error)
        }
      }
      finally {
        // Clean up after message processing is complete
        this.pendingReplies.delete(chatId)
      }
    })

    // Listen for enter chat events
    this.wsClient.on('event.enter_chat', async (frame: WsFrame<EventMessage>) => {
      const body = frame.body
      if (!body)
        return

      const chatId = body.msgid
      const userId = body.from.userid

      const unifiedMsg: UnifiedMessage = {
        id: `wecom-enter-${Date.now()}`,
        chatId,
        userId,
        text: '/start',
        timestamp: Date.now(),
      }

      for (const handler of this.messageHandlers) {
        try {
          await handler(unifiedMsg)
        }
        catch (error) {
          for (const errHandler of this.errorHandlers) {
            errHandler(error as Error)
          }
        }
      }
    })

    this.wsClient.connect()
    this.running = true
    logger.info('WeCom adapter started')
  }

  async stop(): Promise<void> {
    if (!this.running || !this.wsClient)
      return

    this.wsClient.disconnect()
    this.running = false
    this.wsClient = null
    this.pendingReplies.clear()
    logger.info('WeCom adapter stopped')
  }

  async sendMessage(chatId: string, text: string, _options?: SendOptions): Promise<SentMessage> {
    const pending = this.pendingReplies.get(chatId)
    if (!pending || !this.wsClient) {
      logger.warn('WeCom sendMessage: no pending reply or client')
      return { message_id: 0 }
    }

    // Send initial message (intermediate message, isFinal=false)
    this.wsClient.replyStream(pending.frame, pending.streamId, text, false)
    return { message_id: 1 }
  }

  async editMessage(chatId: string, _messageId: number, text: string): Promise<void> {
    const pending = this.pendingReplies.get(chatId)
    if (!pending || !this.wsClient) {
      logger.warn('WeCom editMessage: no pending reply or client')
      return
    }

    // Send message (isFinal determined by caller, defaults to false in Telegram compatible mode)
    this.wsClient.replyStream(pending.frame, pending.streamId, text, false)
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler)
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler)
  }
}
