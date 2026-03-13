import type { Config } from '../config/types.js'
import type { SessionManager } from '../session/manager.js'
import type { EventCallback, IAdapter, UnifiedMessage } from '../types.js'
import { logger } from '../logger/index.js'

interface MessageHandlerDeps {
  adapter: IAdapter
  sessionManager: SessionManager
  config: Config
}

export class MessageHandler {
  private replyMessages = new Map<string, number>()
  private lastEditTime = new Map<string, number>()
  private readonly EDIT_THROTTLE_MS = 1000

  constructor(private deps: MessageHandlerDeps) {}

  async handleMessage(msg: UnifiedMessage): Promise<void> {
    const { adapter, sessionManager, config } = this.deps

    // Handle commands
    if (msg.text.startsWith('/start')) {
      await adapter.sendMessage(msg.chatId, 'Welcome to PiClaw! I am your AI assistant.')
      return
    }

    if (msg.text.startsWith('/help')) {
      await adapter.sendMessage(msg.chatId, 'Commands:\n/start - Start\n/help - Help\n/clear - Clear session')
      return
    }

    if (msg.text.startsWith('/clear')) {
      sessionManager.clear(msg.userId)
      await adapter.sendMessage(msg.chatId, 'Session cleared!')
      return
    }

    // Get or create session for user
    const engine = await sessionManager.getOrCreate(msg.userId, config)

    // Send initial "typing" message
    const replyMsg = await adapter.sendMessage(msg.chatId, '🤔 Thinking...')
    this.replyMessages.set(msg.chatId, replyMsg.message_id)

    // Process message with Pi engine
    let responseBuffer = ''

    await engine.processMessage(msg.text, async (event: Parameters<EventCallback>[0]) => {
      if (event.type === 'text_delta' && event.content) {
        responseBuffer += event.content

        // Throttle edit messages
        const now = Date.now()
        const lastEdit = this.lastEditTime.get(msg.chatId) || 0
        const messageId = this.replyMessages.get(msg.chatId)

        if (messageId && now - lastEdit > this.EDIT_THROTTLE_MS) {
          this.lastEditTime.set(msg.chatId, now)
          try {
            await adapter.editMessage(msg.chatId, messageId, `${responseBuffer} ⏳`)
          }
          catch (e) {
            logger.warn('Failed to edit message (throttled):', e)
          }
        }
      }
      else if (event.type === 'complete') {
        const messageId = this.replyMessages.get(msg.chatId)
        if (messageId) {
          try {
            await adapter.editMessage(msg.chatId, messageId, responseBuffer || '✅ Done')
          }
          catch (e) {
            logger.warn('Failed to edit message (complete):', e)
          }
        }
      }
      else if (event.type === 'error' && event.error) {
        const messageId = this.replyMessages.get(msg.chatId)
        if (messageId) {
          try {
            await adapter.editMessage(msg.chatId, messageId, `❌ Error: ${event.error}`)
          }
          catch (e) {
            logger.warn('Failed to edit message (error):', e)
          }
        }
      }
    })
  }

  clearState(chatId: string): void {
    this.replyMessages.delete(chatId)
    this.lastEditTime.delete(chatId)
  }
}
