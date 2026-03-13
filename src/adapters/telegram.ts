import type { ErrorHandler, IAdapter, MessageHandler, SendOptions, SentMessage, UnifiedMessage } from '../types.js'
import TelegramBot from 'node-telegram-bot-api'
import { logger } from '../logger/index.js'

export class TelegramAdapter implements IAdapter {
  private bot: TelegramBot | null = null
  private messageHandlers: MessageHandler[] = []
  private errorHandlers: ErrorHandler[] = []
  private running = false
  private stopping = false
  private eventsRegistered = false

  constructor(
    private token: string,
    private allowedUsers: number[],
  ) {}

  async start(): Promise<void> {
    if (!this.token) {
      logger.info('Telegram adapter disabled: no token provided')
      return
    }
    logger.warn('Telegram adapter starting...')

    if (this.running)
      return

    // Use native polling - set to false so we manually control it
    this.bot = new TelegramBot(this.token, {
      polling: false,
    })

    // Clean up any existing polling
    try {
      await this.bot.deleteWebHook()
    }
    catch (e) {
      // Ignore
    }

    this.running = true

    // Only register event listeners once
    if (!this.eventsRegistered) {
      // Use 'message' event which automatically handles offset
      this.bot.on('message', async (msg) => {
        if (!msg.text && !msg.caption)
          return
        if (!msg.from)
          return

        // Check user whitelist
        if (this.allowedUsers.length > 0
          && !this.allowedUsers.includes(msg.from.id)) {
          try {
            await this.bot?.sendMessage(msg.chat.id, '⚠️ Unauthorized user')
          }
          catch (e) {
            // Ignore
          }
          return
        }

        const text = msg.text || msg.caption || ''

        // Debug: output raw message format
        logger.debug({ raw: msg }, 'Telegram raw message')

        const unifiedMsg: UnifiedMessage = {
          id: `tg-${msg.message_id}`,
          chatId: msg.chat.id.toString(),
          userId: msg.from.id.toString(),
          text,
          timestamp: msg.date * 1000,
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

      // Handle polling errors
      this.bot.on('polling_error', (error) => {
        logger.error('Telegram polling error:', error.message)

        for (const handler of this.errorHandlers) {
          handler(error)
        }
      })

      this.eventsRegistered = true
    }

    // Start polling
    await this.bot.startPolling()

    logger.info('Telegram adapter started')
  }

  async stop(): Promise<void> {
    if (!this.running || !this.bot)
      return

    this.stopping = true

    try {
      await this.bot.stopPolling()
    }
    catch (e) {
      logger.error('Error stopping polling:', e)
    }

    this.running = false
    this.stopping = false
    this.eventsRegistered = false
    this.bot = null
    logger.info('Telegram adapter stopped')
  }

  async sendMessage(chatId: string, text: string, options?: SendOptions): Promise<SentMessage> {
    if (!this.bot) {
      return { message_id: 0 }
    }

    const result = await this.bot.sendMessage(chatId, text, {
      parse_mode: options?.parseMode,
      reply_to_message_id: options?.replyToMessageId,
    })

    return { message_id: result.message_id }
  }

  async editMessage(chatId: string, messageId: number, text: string): Promise<void> {
    if (!this.bot || !messageId)
      return

    try {
      await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
      })
    }
    catch (error) {
      // Ignore edit errors (rate limits, message not found, etc.)
      const err = error as Error
      if (!err.message.includes('message is not modified')) {
        logger.warn('Edit message error:', err.message)
      }
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler)
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler)
  }
}
