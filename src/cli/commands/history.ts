import type { Command } from 'commander'
import { HistoryStore } from '../../history/history-store.js'
import { join } from 'path'

export function registerHistory(program: Command) {
  program
    .command('history')
    .description('Query release history')
    .option('--breaking', 'Show only breaking changes')
    .option('--scope <scope>', 'Filter by commit scope')
    .option('--type <type>', 'Filter by commit type')
    .option('--since <version>', 'Show entries since version')
    .option('--from <version>', 'Show entries from this version')
    .option('--to <version>', 'Show entries to this version')
    .option('--last <n>', 'Show last N entries')
    .action(async (opts) => {
      const store = new HistoryStore(join('.bumpcraft', 'history.json'))
      const entries = await store.query({
        breaking: opts.breaking,
        scope: opts.scope,
        type: opts.type,
        since: opts.since,
        from: opts.from,
        to: opts.to,
        last: (() => {
          if (!opts.last) return undefined
          const n = Number(opts.last)
          if (!Number.isInteger(n) || n <= 0) {
            console.error('--last must be a positive integer')
            process.exit(1)
          }
          return n
        })()
      })
      if (!entries.length) {
        console.log('No history found.')
        return
      }
      entries.forEach(e => {
        console.log(`\n## ${e.version} (${e.date})`)
        if (e.changelogOutput) console.log(e.changelogOutput)
      })
    })
}
