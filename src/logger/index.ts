import pino from 'pino'

let pinoInstance: pino.Logger

export interface LoggerConfig {
  level?: string
}

export function initLogger(config: LoggerConfig = {}) {
  pinoInstance = pino({
    level: config.level || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  })
}

function log(level: string, ...args: unknown[]) {
  (pinoInstance as any)[level](...args)
}

export const logger = {
  trace(...args: unknown[]) {
    log('trace', ...args)
  },
  debug(...args: unknown[]) {
    log('debug', ...args)
  },
  info(...args: unknown[]) {
    log('info', ...args)
  },
  warn(...args: unknown[]) {
    log('warn', ...args)
  },
  error(...args: unknown[]) {
    log('error', ...args)
  },
}
