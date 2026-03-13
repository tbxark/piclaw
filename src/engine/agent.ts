import type { AgentSession } from '@mariozechner/pi-coding-agent'
import type { Config } from '../config/types.js'
import type { EventCallback } from '../types.js'
import { AuthStorage, createAgentSession, DefaultResourceLoader, SessionManager } from '@mariozechner/pi-coding-agent'
import { resolvePath } from '../config/index.js'
import { logger } from '../logger/index.js'

// Map provider to API type
function getApiForProvider(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'anthropic-messages'
    case 'openai':
    case 'google':
    case 'deepseek':
    case 'mistral':
      return 'openai-completions'
    case 'azure-openai':
      return 'azure-openai-responses'
    default:
      return 'openai-completions' // Default to OpenAI compatible
  }
}

export class PiEngine {
  private session: AgentSession | null = null
  private initialized = false

  constructor(
    private config: Config,
    private tools: any[],
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized)
      return

    const provider = this.config.ai.provider
    const api = getApiForProvider(provider)

    // Create model from config
    const model: any = {
      id: this.config.ai.model,
      provider,
      api,
      baseUrl: this.config.ai.baseURL || '',
      name: this.config.ai.model,
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    }

    // Prepare skills configuration
    const skillsConfig = this.config.skills
    const skillDirs: string[] = []

    // If skills are enabled, load from configured paths
    if (skillsConfig?.enabled) {
      // Add skill directories from config
      if (skillsConfig.dirs) {
        for (const dir of skillsConfig.dirs) {
          skillDirs.push(resolvePath(dir))
        }
      }
    }

    // Create resource loader with skills support
    // noSkills: true disables default ~/.pi/agent/skills discovery
    // We only load from additionalSkillPaths
    const resourceLoader = new DefaultResourceLoader({
      cwd: process.cwd(),
      noSkills: true,
      additionalSkillPaths: skillDirs.length > 0 ? skillDirs : undefined,
      // System prompt override
      systemPromptOverride: this.config.systemPrompt?.override
        ? () => this.config.systemPrompt!.override!
        : undefined,
      // Append to default system prompt
      appendSystemPromptOverride: this.config.systemPrompt?.append
        ? base => [...base, ...this.config.systemPrompt!.append!]
        : undefined,
    })

    // Reload to discover skills
    await resourceLoader.reload()

    // Log discovered skills
    const { skills, diagnostics } = resourceLoader.getSkills()
    if (skills.length > 0) {
      logger.info(`[PiEngine] Loaded ${skills.length} skill(s):`, skills.map(s => s.name).join(', '))
    }
    else {
      logger.info('[PiEngine] No skills loaded')
    }
    if (diagnostics.length > 0) {
      logger.info('[PiEngine] Skill diagnostics:', diagnostics)
    }

    // Create auth storage with API key from config
    const authStorage = AuthStorage.inMemory()
    authStorage.setRuntimeApiKey(provider, this.config.ai.apiKey)

    const { session } = await createAgentSession({
      model,
      tools: this.tools,
      sessionManager: SessionManager.inMemory(),
      resourceLoader,
      authStorage,
    })

    this.session = session
    this.initialized = true
  }

  async processMessage(
    message: string,
    onEvent: EventCallback,
  ): Promise<void> {
    if (!this.session) {
      throw new Error('PiEngine not initialized. Call initialize() first.')
    }

    // Subscribe to session events
    const unsubscribe = this.session.subscribe((event: any) => {
      if (event.type === 'message_update') {
        if (event.assistantMessageEvent?.type === 'text_delta') {
          onEvent({
            type: 'text_delta',
            content: event.assistantMessageEvent.delta,
          })
        }
      }
      else if (event.type === 'tool_call') {
        onEvent({
          type: 'tool_call',
          toolName: event.toolName,
        })
      }
      else if (event.type === 'tool_result') {
        onEvent({
          type: 'tool_result',
          toolResult: event.result,
        })
      }
    })

    try {
      await this.session.prompt(message)
      onEvent({ type: 'complete' })
    }
    catch (error) {
      onEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
    finally {
      unsubscribe()
    }
  }

  async clearSession(): Promise<void> {
    // Session is in-memory, re-initialize to clear
    this.session = null
    this.initialized = false
    await this.initialize()
  }
}
