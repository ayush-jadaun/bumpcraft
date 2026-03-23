import { execSync } from 'child_process'
import type { BumpcraftConfig } from './config.js'
import type { Logger } from './logger.js'

type HookName = 'beforeRelease' | 'afterRelease' | 'beforeBump' | 'afterBump' | 'beforePublish' | 'afterPublish'

export function runHook(
  config: BumpcraftConfig,
  hook: HookName,
  logger: Logger,
  env: Record<string, string> = {}
): void {
  const cmd = config.hooks[hook]
  if (!cmd) return

  logger.info(`Running hook: ${hook}`)
  try {
    execSync(cmd, {
      stdio: 'inherit',
      env: { ...process.env, ...env }
    })
  } catch (e) {
    throw new Error(`Hook "${hook}" failed: ${(e as Error).message}`)
  }
}
