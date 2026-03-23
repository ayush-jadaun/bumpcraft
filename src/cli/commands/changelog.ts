import type { Command } from 'commander'

export function registerChangelog(program: Command) {
  program
    .command('changelog')
    .description('Generate changelog only (no release)')
    .option('--from <ref>', 'Analyze commits from this ref')
    .action(async (opts) => {
      try {
        const { loadConfig } = await import('../../core/config.js')
        const config = await loadConfig('.bumpcraftrc.json')

        if (config.monorepo) {
          const { runMonorepoRelease } = await import('../../index.js')
          const results = await runMonorepoRelease({ dryRun: true, from: opts.from })
          if (!results.length) {
            console.log('No changes found.')
            process.exit(2)
          }
          for (const r of results) {
            if (r.changelogOutput) {
              console.log(`\n--- ${r.package} ---`)
              console.log(r.changelogOutput)
            }
          }
        } else {
          const { runRelease } = await import('../../index.js')
          const result = await runRelease({ dryRun: true, from: opts.from })
          if (result.changelogOutput) {
            console.log(result.changelogOutput)
          } else {
            console.log('No changes found.')
            process.exit(2)
          }
        }
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
