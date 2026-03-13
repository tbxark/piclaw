#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import PiClaw from './index.js'
import { logger } from './logger/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

const program = new Command()

program
  .name('piclaw')
  .description('Minimal OpenClaw implementation based on Pi-Mono')
  .version(packageJson.version)

program
  .command('start')
  .description('Start PiClaw service')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    const piclaw = new PiClaw()

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`)
      await piclaw.stop()
      process.exit(0)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    try {
      await piclaw.start(options.config)
    }
    catch (error) {
      logger.error('Failed to start:', error)
      process.exit(1)
    }
  })

// Parse command line arguments
program.parse()
