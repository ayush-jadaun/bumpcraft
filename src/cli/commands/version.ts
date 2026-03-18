import type { Command } from 'commander'
import { currentVersion } from '../../index.js'

export function registerVersion(program: Command) {
  program
    .command('version')
    .description('Show current version')
    .action(async () => {
      const v = await currentVersion()
      console.log(v)
    })
}
