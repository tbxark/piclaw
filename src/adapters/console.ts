import type { ErrorHandler, IAdapter, MessageHandler, SendOptions, SentMessage, UnifiedMessage } from '../types.js'
import readline from 'node:readline'
import { logger } from '../logger/index.js'

export class ConsoleAdapter implements IAdapter {
  private rl: readline.Interface | null = null
  private messageHandlers: MessageHandler[] = []
  private errorHandlers: ErrorHandler[] = []
  private running = false
  private messageIdCounter = 0

  async start(): Promise<void> {
    if (this.running)
      return

    this.running = true
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    logger.info('Console adapter started. Type your messages and press Enter.')

    this.rl.on('line', async (line) => {
      const text = line.trim()
      if (!text)
        return

      const msg: UnifiedMessage = {
        id: `console-${Date.now()}`,
        chatId: 'console',
        userId: 'console-user',
        text,
        timestamp: Date.now(),
      }

      for (const handler of this.messageHandlers) {
        try {
          await handler(msg)
        }
        catch (error) {
          for (const errHandler of this.errorHandlers) {
            errHandler(error as Error)
          }
        }
      }
    })
  }

  async stop(): Promise<void> {
    if (!this.running)
      return

    this.running = false
    if (this.rl) {
      this.rl.close()
      this.rl = null
    }
  }

  async sendMessage(chatId: string, text: string, _options?: SendOptions): Promise<SentMessage> {
    logger.info(`[Bot]: ${text}`)
    return { message_id: ++this.messageIdCounter }
  }

  async editMessage(chatId: string, messageId: number, text: string): Promise<void> {
    // Console doesn't support editing, just output
    logger.info(`[Edit ${messageId}]: ${text}`)
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler)
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler)
  }
}

export default ConsoleAdapter
