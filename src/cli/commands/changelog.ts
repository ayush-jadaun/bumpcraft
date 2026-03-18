import type { Command } from 'commander'
import { runRelease } from '../../index.js'

export function registerChangelog(program: Command) {
  program
    .command('changelog')
    .description('Generate changelog only (no release)')
    .option('--from <ref>', 'Analyze commits from this ref')
    .action(async (opts) => {
      const result = await runRelease({ dryRun: true, from: opts.from })
      if (result.changelogOutput) {
        console.log(result.changelogOutput)
      } else {
        console.log('No changes found.')
      }
    })
}
