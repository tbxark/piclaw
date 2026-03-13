import type { Config } from '../config/types.js'
import { createBashTool, createReadTool, createWriteTool } from '@mariozechner/pi-coding-agent'

export function createTools(config: Config, cwd: string) {
  const tools: any[] = []

  if (config.tools.read) {
    tools.push(createReadTool(cwd))
  }

  if (config.tools.write) {
    tools.push(createWriteTool(cwd))
  }

  if (config.tools.bash) {
    tools.push(createBashTool(cwd))
  }

  return tools
}
