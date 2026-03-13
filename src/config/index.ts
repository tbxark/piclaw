import type { Config } from './types.js'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

export function resolvePath(inputPath: string, base: string = process.cwd()): string {
  return isAbsolute(inputPath) ? inputPath : join(base, inputPath)
}

function resolveConfigPath(inputPath: string): string {
  const path = resolvePath(inputPath)

  if (!existsSync(path)) {
    throw new Error(`Config path not found: ${path}`)
  }

  const stat = statSync(path)

  // If it's a directory, look for config.json inside
  if (stat.isDirectory()) {
    const configInDir = join(path, 'config.json')
    if (existsSync(configInDir)) {
      return configInDir
    }
    // Also check for config.default.json
    const configDefaultInDir = join(path, 'config.default.json')
    if (existsSync(configDefaultInDir)) {
      return configDefaultInDir
    }
    throw new Error(`No config.json found in directory: ${path}`)
  }

  // It's a file, return as-is
  return path
}

export function loadConfig(configPath?: string): Config {
  // Use provided config path
  if (configPath) {
    const resolvedPath = resolveConfigPath(configPath)
    const configData = readFileSync(resolvedPath, 'utf-8')
    return JSON.parse(configData) as Config
  }

  // Fall back to default behavior: try config.json first, then config.default.json
  const configPaths = [
    resolvePath('config.json'),
    resolvePath('config.default.json'),
  ]

  let configData: string | null = null

  for (const path of configPaths) {
    if (existsSync(path)) {
      configData = readFileSync(path, 'utf-8')
      break
    }
  }

  if (!configData) {
    throw new Error('No config file found. Please create config.json or config.default.json')
  }

  return JSON.parse(configData) as Config
}
