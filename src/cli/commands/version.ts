import type { Command } from 'commander'
import { currentVersion } from '../../index.js'

export function registerVersion(program: Command) {
  program
    .command('version')
    .description('Show current version')
    .action(async () => {
      try {
        const v = await currentVersion()
        console.log(v)
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
