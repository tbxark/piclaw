export interface Config {
  // AI Configuration
  ai: {
    provider: 'anthropic' | 'openai' | 'google' | 'deepseek' | 'mistral' | 'azure-openai'
    model: string
    apiKey: string
    baseURL?: string // Optional, for OpenAI compatible APIs (DeepSeek, OpenRouter, Ollama, etc.)
  }

  // Session Configuration
  session: {
    provider: 'memory' | 'redis'
  }

  // Telegram Configuration
  telegram: {
    enabled: boolean
    token: string
    allowedUsers: number[]
  }

  // WeCom Configuration
  wecom: {
    enabled: boolean
    botId: string
    secret: string
  }

  // Console Configuration
  console: {
    enabled: boolean
  }

  // Tools Configuration
  tools: {
    read: boolean
    write: boolean
    bash: boolean
    bashAllowedCommands?: string[]
  }

  // Skills Configuration
  skills?: {
    enabled: boolean
    dirs?: string[] // Additional skill directories to scan
  }

  // System Prompt Configuration
  systemPrompt?: {
    // Completely replace the default system prompt
    override?: string
    // Append to the default system prompt instructions
    append?: string[]
  }

  // Log Configuration
  log?: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  }
}
