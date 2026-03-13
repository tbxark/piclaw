import type { Config } from '../config/types.js'
import type { IAdapter } from '../types.js'
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

  return null
}

export { TelegramAdapter, WeComAdapter }
export type { IAdapter } from '../types.js'
