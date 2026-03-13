# PiClaw

A minimal implementation of OpenClaw based on [pi-mono](https://github.com/AnotherButler/pi-mono). This project provides a lightweight AI agent runtime that can be integrated with messaging platforms like Telegram.

## Origin

This project is inspired by the OpenClaw architecture, which uses `pi-mono` (specifically `@mariozechner/pi-agent-core` and `@mariozechner/pi-coding-agent`) as its core reasoning engine. The original OpenClaw is a full-featured AI agent system, while PiClaw aims to be a minimal, focused implementation.

## Requirements

- Node.js 18+
- pnpm (or npm/yarn)
- Telegram Bot Token (optional, for Telegram integration)

## Installation

```bash
pnpm install
```

## Configuration

Copy the default configuration and edit it:

```bash
cp config.default.json config.json
```

Edit `config.json` with your settings:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "your-api-key-here"
  },
  "telegram": {
    "enabled": true,
    "token": "your-telegram-bot-token",
    "allowedUsers": ["your-telegram-user-id"]
  },
  "tools": {
    "read": true,
    "write": true,
    "bash": true
  }
}
```

Required configuration:
- `ai.apiKey` - Your LLM API key (required)
- `telegram.token` - Telegram Bot Token (if using Telegram)
- `telegram.allowedUsers` - Array of allowed Telegram user IDs

## Running

Development mode:
```bash
pnpm dev
```

Production mode:
```bash
pnpm build
pnpm start
```
