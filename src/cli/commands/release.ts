import type { Command } from 'commander'
import { runRelease } from '../../index.js'
import { confirmRelease, openInEditor } from '../interactive.js'
import { PolicyEngine } from '../../policies/policy-engine.js'
import { loadConfig } from '../../core/config.js'
import type { BumpType } from '../../pipeline/types.js'

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
    .action(async (opts) => {
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

      const policy = engine.check(preview.bumpType as BumpType)
      if (!policy.allowed && !opts.approve) {
        console.error(`Release blocked: ${policy.reason}`)
        process.exit(1)
      }

      if (opts.dryRun) {
        console.log(`[dry-run] Would release: ${preview.nextVersion} (${preview.bumpType})`)
        if (preview.changelogOutput) console.log(preview.changelogOutput)
        return
      }

      let overrideChangelog: string | undefined
      if (opts.interactive) {
        const answer = await confirmRelease(
          preview.bumpType,
          preview.nextVersion!,
          preview.changelogOutput ?? ''
        )
        if (answer === 'abort') { console.log('Aborted.'); return }
        if (answer === 'edit') {
          overrideChangelog = await openInEditor(preview.changelogOutput ?? '')
          console.log('Proceeding with edited changelog...')
        }
      }

      const result = await runRelease({
        preRelease: opts.preRelease,
        forceBump: opts.forceBump,
        from: opts.from,
        verbose: opts.verbose,
        overrideChangelog
      })

      console.log(`Released: ${result.nextVersion}`)
      if (result.releaseResult?.url) console.log(`GitHub release: ${result.releaseResult.url}`)
    })
}
