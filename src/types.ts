// Unified message format for all adapters
export interface UnifiedMessage {
  id: string
  chatId: string
  userId: string
  text: string
  timestamp: number
}

// Adapter send options
export interface SendOptions {
  parseMode?: 'Markdown' | 'HTML'
  replyToMessageId?: number
}

// Adapter message handler
export type MessageHandler = (msg: UnifiedMessage) => Promise<void>

// Adapter error handler
export type ErrorHandler = (error: Error) => void

// Message sent response
export interface SentMessage {
  message_id: number
}

// IAdapter interface - all adapters must implement this
export interface IAdapter {
  start: () => Promise<void>
  stop: () => Promise<void>
  sendMessage: (chatId: string, text: string, options?: SendOptions) => Promise<SentMessage>
  editMessage: (chatId: string, messageId: number, text: string) => Promise<void>
  onMessage: (handler: MessageHandler) => void
  onError: (handler: ErrorHandler) => void
}

// Event callback for agent events
export interface AgentEvent {
  type: 'text_delta' | 'tool_call' | 'tool_result' | 'complete' | 'error'
  content?: string
  toolName?: string
  toolResult?: string
  error?: string
}

export type EventCallback = (event: AgentEvent) => void
export type Unsubscribe = () => void
