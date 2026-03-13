import type { IAdapter } from './adapters/index.js'
import type { Config } from './config/types.js'
import { createAdapter } from './adapters/index.js'
import { loadConfig } from './config/index.js'
import { PiEngine } from './engine/agent.js'
import { MessageHandler } from './handlers/message.js'
import { SessionManager } from './session/manager.js'
import { createTools } from './tools/index.js'

export interface ContainerDeps {
  configPath?: string
}

export interface Container {
  config: Config
  adapter: IAdapter | null
  sessionManager: SessionManager
  messageHandler: MessageHandler
}

export function createContainer(deps: ContainerDeps): Container {
  // 1. Load config
  const config = loadConfig(deps.configPath)

  // 2. Create tools
  const tools = createTools(config, process.cwd())

  // 3. Create adapter
  const adapter = createAdapter(config)

  // 4. Create Engine factory function
  const engineFactory = (cfg: Config) => new PiEngine(cfg, tools)

  // 5. Create SessionManager
  const sessionManager = new SessionManager(engineFactory)

  // 6. Create MessageHandler
  const messageHandler = new MessageHandler({
    adapter: adapter!,
    sessionManager,
    config,
  })

  return {
    config,
    adapter,
    sessionManager,
    messageHandler,
  }
}
