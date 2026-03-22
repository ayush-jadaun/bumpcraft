import type { Command } from 'commander'
import { SemVer } from '../../core/semver.js'
import { GitClient } from '../../core/git-client.js'
import { loadConfig } from '../../core/config.js'
import { createVersionSource } from '../../core/version-source.js'
import { HistoryStore } from '../../history/history-store.js'
import { join } from 'path'

export function registerInitRelease(program: Command) {
  program
    .command('init-release')
    .description('Tag the current commit as a baseline release (for adopting bumpcraft in existing projects)')
    .requiredOption('--version <version>', 'Version to tag (e.g. 1.0.0)')
    .option('--message <msg>', 'Tag message', 'Initial release')
    .option('--force', 'Overwrite existing tag')
    .option('--allow-dirty', 'Allow tagging with uncommitted changes')
    .option('--no-commit', 'Skip committing the package.json change')
    .action(async (opts) => {
      try {
        // Validate version
        let version: SemVer
        try {
          version = SemVer.parse(opts.version)
        } catch {
          console.error(`Invalid semver: "${opts.version}"`)
          process.exit(1)
          return
        }

        const git = new GitClient()
        const tagName = `v${version.toString()}`

        // Check for commits
        if (!(await git.hasCommits())) {
          console.error('No commits in repository. Make at least one commit first.')
          process.exit(1)
          return
        }

        // Check dirty working tree
        if (!opts.allowDirty && await git.isDirty()) {
          console.error('Working tree has uncommitted changes. Commit them first or use --allow-dirty.')
          process.exit(1)
          return
        }

        // Check tag exists
        if (await git.tagExists(tagName)) {
          if (!opts.force) {
            console.error(`Tag ${tagName} already exists. Use --force to overwrite.`)
            process.exit(1)
            return
          }
          // Delete existing tag to recreate
          try {
            await git.deleteTag(tagName)
          } catch {
            console.error(`Failed to delete existing tag ${tagName}`)
            process.exit(1)
            return
          }
        }

        // Update package.json version
        const config = await loadConfig('.bumpcraftrc.json')
        const versionSource = createVersionSource(config.versionSource)
        await versionSource.write(version)
        console.log(`Updated ${config.versionSource} to ${version.toString()}`)

        // Create git tag
        await git.createTag(tagName, opts.message)
        console.log(`Created tag ${tagName}`)

        // Record in release history
        const store = new HistoryStore(join('.bumpcraft', 'history.json'))
        await store.save({
          version: version.toString(),
          previousVersion: '0.0.0',
          date: new Date().toISOString(),
          commits: [],
          changelogOutput: `Baseline release — adopted bumpcraft at ${version.toString()}`
        })
        console.log(`Recorded in release history`)

        console.log(`\nBaseline release ${tagName} created successfully.`)
        console.log(`Future \`bumpcraft release\` will only look at commits after this point.`)

      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
