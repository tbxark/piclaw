import type { Container } from './container.js'
import type { UnifiedMessage } from './types.js'
import { loadConfig } from './config/index.js'
import { createContainer } from './container.js'
import { initLogger, logger } from './logger/index.js'

class PiClaw {
  private container: Container | null = null

  async start(configPath?: string): Promise<void> {
    const config = loadConfig(configPath)
    initLogger(config.log)
    logger.info('Starting PiClaw...')

    this.container = createContainer({ configPath })

    const { adapter } = this.container

    if (!adapter) {
      throw new Error('No adapter enabled. Please configure telegram or console in config.json')
    }

    adapter.onMessage(this.handleMessage.bind(this))
    adapter.onError(this.handleError.bind(this))
    await adapter.start()

    logger.info('PiClaw started successfully')
  }

  async stop(): Promise<void> {
    if (this.container?.adapter) {
      await this.container.adapter.stop()
    }
    logger.info('PiClaw stopped')
  }

  private async handleMessage(msg: UnifiedMessage): Promise<void> {
    if (!this.container?.messageHandler) {
      logger.error('MessageHandler not initialized')
      return
    }

    try {
      await this.container.messageHandler.handleMessage(msg)
    }
    catch (error) {
      logger.error('Error handling message:', error)
      if (this.container?.adapter) {
        try {
          await this.container.adapter.sendMessage(msg.chatId, `❌ Error: ${(error as Error).message}`)
        }
        catch (e) {
          // Ignore send errors
        }
      }
    }
  }

  private handleError(error: Error): void {
    logger.error('Adapter error:', error)
  }
}

export default PiClaw
