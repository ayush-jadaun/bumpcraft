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
    .option('--create-pr', 'Create a "Version Packages" PR instead of pushing directly')
    .option('--package <name>', 'Release a specific monorepo package')
    .action(async (opts) => {
      try {
        if (opts.forceBump && !VALID_BUMPS.includes(opts.forceBump)) {
          console.error(`--force-bump must be one of: ${VALID_BUMPS.join(', ')}`)
          process.exit(1)
        }

        // Monorepo mode
        const monoConfig = await loadConfig('.bumpcraftrc.json')
        if (monoConfig.monorepo) {
          const { runMonorepoRelease } = await import('../../index.js')
          const results = await runMonorepoRelease({
            dryRun: opts.dryRun,
            preRelease: opts.preRelease,
            forceBump: opts.forceBump,
            from: opts.from,
            verbose: opts.verbose,
            package: opts.package
          })

          if (!results.length) {
            console.log('No packages to release.')
            process.exit(2)
          }

          for (const r of results) {
            console.log(`${r.package}: ${r.currentVersion} → ${r.nextVersion} (${r.bumpType})`)
          }

          if (opts.push && !opts.dryRun) {
            const { GitClient } = await import('../../core/git-client.js')
            const git = new GitClient()
            const { execSync } = await import('child_process')
            try {
              execSync('git add -A', { stdio: 'pipe' })
              const names = results.map(r => `${r.package}@${r.nextVersion}`).join(', ')
              execSync(`git commit -m "chore(release): ${names} [skip ci]"`, { stdio: 'pipe' })
            } catch { /* nothing to commit */ }
            await git.push()
            try {
              for (const r of results) {
                await git.pushTag(`${r.package}@${r.nextVersion}`).catch(() => {})
              }
            } catch { /* */ }
            console.log('Pushed all changes and tags to remote')
          }
          return
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
            execSync(`git commit -m "chore(release): ${result.nextVersion} [skip ci]"`, { stdio: 'pipe' })
          } catch { /* nothing to commit */ }
          try {
            await git.createTag(tagName, `Release ${result.nextVersion}`)
          } catch { /* tag may already exist from GitHub release */ }
          await git.push()
          try {
            await git.pushTag(tagName)
          } catch { /* tag may already exist on remote from GitHub release */ }
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

        // Create PR instead of pushing directly
        if (opts.createPr && result.nextVersion) {
          const token = process.env.GITHUB_TOKEN
          const repo = process.env.GITHUB_REPOSITORY
          if (!token || !repo) {
            console.error('--create-pr requires GITHUB_TOKEN and GITHUB_REPOSITORY env vars')
            process.exit(1)
          }

          const { execSync } = await import('child_process')
          const branchName = `bumpcraft/release-v${result.nextVersion}`

          try {
            execSync(`git checkout -b "${branchName}"`, { stdio: 'pipe' })
            execSync('git add package.json CHANGELOG.md .bumpcraft/ .changeset/', { stdio: 'pipe' })
            execSync(`git commit -m "chore(release): v${result.nextVersion}"`, { stdio: 'pipe' })
            execSync(`git push origin "${branchName}"`, { stdio: 'pipe' })
          } catch { /* nothing to commit or push */ }

          // Get the default branch
          let baseBranch = 'main'
          try {
            baseBranch = execSync('git rev-parse --abbrev-ref HEAD@{upstream}', { stdio: 'pipe' }).toString().trim().split('/').pop() ?? 'main'
          } catch {
            try {
              const res = await fetch(`https://api.github.com/repos/${repo}`, {
                headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'bumpcraft' }
              })
              if (res.ok) {
                const data = await res.json() as { default_branch: string }
                baseBranch = data.default_branch
              }
            } catch { /* fallback to main */ }
          }

          // Create the PR
          try {
            const prBody = `## Version Packages\n\nThis PR was created by \`bumpcraft release --create-pr\`.\n\n**Version:** ${result.nextVersion}\n**Bump:** ${result.bumpType}\n\n### Changelog\n\n${result.changelogOutput ?? 'No changelog generated.'}`

            const res = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'bumpcraft'
              },
              body: JSON.stringify({
                title: `chore(release): v${result.nextVersion}`,
                body: prBody,
                head: branchName,
                base: baseBranch
              })
            })

            if (res.ok) {
              const data = await res.json() as { html_url: string }
              console.log(`Version PR created: ${data.html_url}`)
            } else {
              const err = await res.json() as { message: string }
              console.error(`Failed to create PR: ${res.status} — ${err.message}`)
            }
          } catch (e) {
            console.error(`Failed to create PR: ${(e as Error).message}`)
          }

          // Switch back to the original branch
          try { execSync('git checkout -', { stdio: 'pipe' }) } catch { /* */ }
        }
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
