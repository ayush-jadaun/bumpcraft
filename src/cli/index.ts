#!/usr/bin/env node
import { Command } from 'commander'
import { registerRelease } from './commands/release.js'
import { registerVersion } from './commands/version.js'
import { registerChangelog } from './commands/changelog.js'
import { registerInit } from './commands/init.js'
import { registerPlugins } from './commands/plugins.js'
import { registerGroup } from './commands/group.js'
import { registerHistory } from './commands/history.js'
import { registerInitRelease } from './commands/init-release.js'
import { registerPublish } from './commands/publish.js'
import { registerStatus } from './commands/status.js'
import { registerChangeset } from './commands/changeset.js'

const program = new Command()

program
  .name('bumpcraft')
  .description('Pluggable semantic versioning and changelog automation')
  .version('1.0.0')

registerRelease(program)
registerVersion(program)
registerChangelog(program)
registerInit(program)
registerPlugins(program)
registerGroup(program)
registerHistory(program)
registerInitRelease(program)
registerPublish(program)
registerStatus(program)
registerChangeset(program)

program
  .command('validate')
  .description('Preview what a release would do (alias for release --dry-run)')
  .action(async () => {
    try {
      const { loadConfig } = await import('../core/config.js')
      const config = await loadConfig('.bumpcraftrc.json')

      if (config.monorepo) {
        const { runMonorepoRelease } = await import('../index.js')
        const results = await runMonorepoRelease({ dryRun: true })
        if (!results.length) {
          console.log('No release needed.')
          process.exit(2)
        }
        for (const r of results) {
          console.log(`${r.package}: ${r.currentVersion} → ${r.nextVersion} (${r.bumpType})`)
          if (r.changelogOutput) console.log(r.changelogOutput)
        }
      } else {
        const { runRelease } = await import('../index.js')
        const result = await runRelease({ dryRun: true })
        if (result.bumpType === 'none') {
          console.log('No release needed.')
          process.exit(2)
        }
        console.log(`Would release: ${result.nextVersion} (${result.bumpType})`)
        if (result.changelogOutput) console.log(result.changelogOutput)
      }
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`)
      process.exit(1)
    }
  })

program.parse(process.argv)
