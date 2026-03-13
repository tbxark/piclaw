import type { Config } from '../config/types.js'
import type { PiEngine } from '../engine/agent.js'

interface Session {
  engine: PiEngine
  createdAt: number
}

type EngineFactory = (config: Config) => PiEngine

export class SessionManager {
  private sessions = new Map<string, Session>()

  constructor(private engineFactory: EngineFactory) {}

  async getOrCreate(userId: string, config: Config): Promise<PiEngine> {
    const existing = this.sessions.get(userId)
    if (existing) {
      return existing.engine
    }

    const engine = this.engineFactory(config)
    await engine.initialize()

    this.sessions.set(userId, {
      engine,
      createdAt: Date.now(),
    })

    return engine
  }

  clear(userId: string): void {
    this.sessions.delete(userId)
  }

  clearAll(): void {
    this.sessions.clear()
  }

  getAll(): Map<string, Session> {
    return this.sessions
  }

  getSessionCount(): number {
    return this.sessions.size
  }
}
