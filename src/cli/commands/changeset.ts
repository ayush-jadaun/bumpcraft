import type { Command } from 'commander'
import { createChangeset, readChangesets } from '../../core/changeset-files.js'
import { loadConfig } from '../../core/config.js'
import { createInterface } from 'readline'

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export function registerChangeset(program: Command) {
  const cmd = program.command('changeset').description('Manage changeset files')

  cmd.command('create')
    .description('Create a new changeset file')
    .option('--package <names...>', 'Package names to include')
    .option('--bump <type>', 'Bump type: major, minor, or patch')
    .option('--message <msg>', 'Summary of the change')
    .action(async (opts) => {
      try {
        const config = await loadConfig('.bumpcraftrc.json')
        const packages: Record<string, 'major' | 'minor' | 'patch'> = {}

        if (opts.package && opts.bump) {
          // Non-interactive
          const bump = opts.bump as 'major' | 'minor' | 'patch'
          if (!['major', 'minor', 'patch'].includes(bump)) {
            console.error('--bump must be major, minor, or patch')
            process.exit(1)
          }
          for (const pkg of opts.package) {
            packages[pkg] = bump
          }
        } else if (config.monorepo) {
          // Interactive: ask for each package
          const pkgNames = Object.keys(config.monorepo)
          console.log('Which packages does this change affect?\n')
          for (const name of pkgNames) {
            const answer = await ask(`  ${name} (major/minor/patch/skip): `)
            if (answer === 'major' || answer === 'minor' || answer === 'patch') {
              packages[name] = answer
            }
          }
        } else {
          // Single package
          const bump = await ask('Bump type (major/minor/patch): ')
          if (bump === 'major' || bump === 'minor' || bump === 'patch') {
            packages['root'] = bump
          }
        }

        if (Object.keys(packages).length === 0) {
          console.log('No packages selected — changeset not created.')
          return
        }

        const summary = opts.message ?? await ask('\nSummary of the change: ')
        if (!summary) {
          console.error('Summary is required.')
          process.exit(1)
        }

        const id = await createChangeset(packages, summary)
        console.log(`Created changeset: .changeset/${id}.md`)
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })

  cmd.command('list')
    .description('List pending changesets')
    .action(async () => {
      try {
        const changesets = await readChangesets()
        if (!changesets.length) {
          console.log('No pending changesets.')
          return
        }
        for (const cs of changesets) {
          const pkgs = Object.entries(cs.packages).map(([n, b]) => `${n}:${b}`).join(', ')
          console.log(`  ${cs.id} — ${pkgs} — ${cs.summary.slice(0, 60)}`)
        }
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
