import type { Config } from '../config/types.js'
import type { IAdapter } from '../types.js'
import { ConsoleAdapter } from './console.js'
import { TelegramAdapter } from './telegram.js'
import { WeComAdapter } from './wecom.js'

export function createAdapter(config: Config): IAdapter | null {
  // Check WeCom first
  if (config.wecom.enabled && config.wecom.botId && config.wecom.secret) {
    return new WeComAdapter(config.wecom.botId, config.wecom.secret)
  }

  if (config.telegram.enabled && config.telegram.token) {
    return new TelegramAdapter(config.telegram.token, config.telegram.allowedUsers)
  }

  if (config.console.enabled) {
    return new ConsoleAdapter()
  }

  return null
}

export { ConsoleAdapter, TelegramAdapter, WeComAdapter }
export type { IAdapter } from '../types.js'
