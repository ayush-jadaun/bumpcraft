import type { Command } from 'commander'
import { runRelease } from '../../index.js'
import { confirmRelease, openInEditor } from '../interactive.js'
import { PolicyEngine } from '../../policies/policy-engine.js'
import { loadConfig } from '../../core/config.js'
import { HistoryStore } from '../../history/history-store.js'
import type { BumpType } from '../../pipeline/types.js'
import { join } from 'path'

const VALID_BUMPS = ['major', 'minor', 'patch']

export function registerRelease(program: Command) {
  program
    .command('release')
    .description('Run the full release pipeline')
    .option('--dry-run', 'Preview without making changes')
    .option('-i, --interactive', 'Confirm before releasing')
    .option('--approve', 'Approve a policy-blocked release')
    .option('--pre-release <tag>', 'Pre-release tag (e.g. alpha, beta)')
    .option('--force-bump <type>', 'Force major/minor/patch bump')
    .option('--from <ref>', 'Analyze commits from this ref')
    .option('-v, --verbose', 'Verbose output')
    .option('--push', 'Push the commit and tag to remote after release')
    .action(async (opts) => {
      try {
        if (opts.forceBump && !VALID_BUMPS.includes(opts.forceBump)) {
          console.error(`--force-bump must be one of: ${VALID_BUMPS.join(', ')}`)
          process.exit(1)
        }

        const config = await loadConfig('.bumpcraftrc.json')
        const engine = new PolicyEngine(config.policies)

        const preview = await runRelease({
          dryRun: true,
          preRelease: opts.preRelease,
          forceBump: opts.forceBump,
          from: opts.from,
          verbose: opts.verbose
        })

        if (preview.bumpType === 'none') {
          console.log('No release needed.')
          process.exit(2)
        }

        // Compute today's release count for maxBumpPerDay enforcement
        const store = new HistoryStore(join('.bumpcraft', 'history.json'))
        const allEntries = await store.getAll()
        const today = new Date().toDateString()
        const todayReleaseCount = allEntries.filter(e => new Date(e.date).toDateString() === today).length

        const policy = engine.check(preview.bumpType as BumpType, todayReleaseCount)
        if (!policy.allowed && !opts.approve) {
          console.error(`Release blocked: ${policy.reason}`)
          process.exit(1)
        }

        if (opts.dryRun) {
          console.log(`[dry-run] Would release: ${preview.nextVersion} (${preview.bumpType})`)
          if (preview.changelogOutput) console.log(preview.changelogOutput)
          return
        }

        // autoRelease: if not in autoRelease list, require confirmation (unless --approve or -i already set)
        const forceInteractive = opts.interactive || (policy.requiresConfirmation && !opts.approve)

        let overrideChangelog: string | undefined
        if (forceInteractive) {
          const answer = await confirmRelease(
            preview.bumpType,
            preview.nextVersion!,
            preview.changelogOutput ?? ''
          )
          if (answer === 'abort') { console.log('Aborted.'); return }
          if (answer === 'edit') {
            try {
              overrideChangelog = await openInEditor(preview.changelogOutput ?? '')
              console.log('Proceeding with edited changelog...')
            } catch (e) {
              console.error(`Editor failed: ${(e as Error).message}. Set $EDITOR to your preferred editor.`)
              console.log('Proceeding without edits...')
            }
          }
        }

        const result = await runRelease({
          preRelease: opts.preRelease,
          // Lock in the policy-checked bump type to prevent race conditions
          // between the dry-run check and the actual release
          forceBump: opts.forceBump ?? preview.bumpType,
          from: opts.from,
          verbose: opts.verbose,
          overrideChangelog
        })

        console.log(`Released: ${result.nextVersion}`)
        if (result.releaseResult?.url) {
          console.log(`GitHub release: ${result.releaseResult.url}`)
        } else if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
          console.log(`Tip: add "bumpcraft-plugin-github" to your .bumpcraftrc.json plugins to create GitHub releases with changelogs`)
        }

        // Push commit + tag if requested
        if (opts.push && result.nextVersion) {
          const { GitClient } = await import('../../core/git-client.js')
          const git = new GitClient()
          const tagName = `v${result.nextVersion}`
          try {
            const { execSync } = await import('child_process')
            execSync('git add package.json CHANGELOG.md .bumpcraft/', { stdio: 'pipe' })
            execSync(`git commit -m "chore(release): ${result.nextVersion}"`, { stdio: 'pipe' })
          } catch { /* nothing to commit */ }
          try {
            await git.createTag(tagName, `Release ${result.nextVersion}`)
          } catch { /* tag may already exist from GitHub release */ }
          await git.push()
          await git.pushTag(tagName)
          console.log(`Pushed commit and tag ${tagName} to remote`)

          // If GitHub plugin didn't run but we have a token, create a GitHub release
          // so the tag has proper release notes instead of being bare
          if (!result.releaseResult?.url) {
            const token = process.env.GITHUB_TOKEN
            const repo = process.env.GITHUB_REPOSITORY
            if (token && repo) {
              try {
                const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'bumpcraft'
                  },
                  body: JSON.stringify({
                    tag_name: tagName,
                    name: tagName,
                    body: result.changelogOutput ?? '',
                    draft: false,
                    prerelease: false
                  })
                })
                if (res.ok) {
                  const data = await res.json() as { html_url: string }
                  console.log(`GitHub release: ${data.html_url}`)
                }
              } catch { /* best-effort */ }
            }
          }
        }
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
