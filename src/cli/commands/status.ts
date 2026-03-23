import type { Command } from 'commander'
import { loadConfig } from '../../core/config.js'
import { GitClient } from '../../core/git-client.js'
import { readFile } from 'fs/promises'
import { join } from 'path'

export function registerStatus(program: Command) {
  program
    .command('status')
    .description('Show pending changes and what would be released')
    .action(async () => {
      try {
        const config = await loadConfig('.bumpcraftrc.json')
        const git = new GitClient()
        const latestTag = await git.getLatestTag()
        const commits = await git.getCommitsSince(latestTag)

        if (!commits.length) {
          console.log('No commits since last release.')
          return
        }

        console.log(`${commits.length} commit(s) since ${latestTag ?? 'beginning'}\n`)

        if (config.monorepo) {
          // Parse scopes
          const byPackage = new Map<string, string[]>()
          const unscoped: string[] = []

          for (const raw of commits) {
            const match = /^[a-fA-F0-9]+\s+\w+\(([^)]+)\)/.exec(raw.split('\n')[0])
            if (match?.[1] && config.monorepo[match[1]]) {
              const pkg = match[1]
              if (!byPackage.has(pkg)) byPackage.set(pkg, [])
              byPackage.get(pkg)!.push(raw)
            } else if (!match) {
              unscoped.push(raw)
            }
          }

          for (const [pkgName, pkgConfig] of Object.entries(config.monorepo)) {
            const pc = pkgConfig as { path: string }
            let version = '0.0.0'
            try {
              const content = await readFile(join(pc.path, 'package.json'), 'utf-8')
              version = JSON.parse(content).version ?? '0.0.0'
            } catch { /* */ }

            const pkgCommits = byPackage.get(pkgName) ?? []
            const total = pkgCommits.length + unscoped.length

            if (total === 0) {
              console.log(`📦 ${pkgName} (${version}) — no changes`)
            } else {
              const hasBreaking = [...pkgCommits, ...unscoped].some(c =>
                /![:]\s/.test(c.split('\n')[0]) || c.includes('BREAKING CHANGE:')
              )
              const hasFeat = [...pkgCommits, ...unscoped].some(c =>
                /\s+feat[(!:]/.test(c.split('\n')[0])
              )
              const bump = hasBreaking ? 'major' : hasFeat ? 'minor' : 'patch'
              console.log(`📦 ${pkgName} (${version}) — ${total} commit(s) → ${bump} bump`)
              for (const c of pkgCommits) {
                console.log(`   ${c.split('\n')[0].slice(0, 80)}`)
              }
              if (unscoped.length > 0) {
                console.log(`   + ${unscoped.length} unscoped commit(s)`)
              }
            }
          }
        } else {
          // Single package
          const { runRelease } = await import('../../index.js')
          const result = await runRelease({ dryRun: true })
          if (result.bumpType === 'none') {
            console.log('No releasable changes.')
          } else {
            console.log(`Would release: ${result.currentVersion} → ${result.nextVersion} (${result.bumpType})`)
            console.log(`\n${commits.length} commit(s):`)
            for (const c of commits) {
              console.log(`  ${c.split('\n')[0].slice(0, 80)}`)
            }
          }
        }
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
