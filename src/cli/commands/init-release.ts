import type { Command } from 'commander'
import { SemVer } from '../../core/semver.js'
import { GitClient } from '../../core/git-client.js'
import { loadConfig } from '../../core/config.js'
import { createVersionSource } from '../../core/version-source.js'
import { HistoryStore } from '../../history/history-store.js'
import { join } from 'path'
import { execSync } from 'child_process'

export function registerInitRelease(program: Command) {
  program
    .command('init-release')
    .description('Tag the current commit as a baseline release (for adopting bumpcraft in existing projects)')
    .requiredOption('--tag-version <version>', 'Version to tag (e.g. 1.0.0)')
    .option('--message <msg>', 'Tag message', 'Initial release')
    .option('--force', 'Overwrite existing tag')
    .option('--allow-dirty', 'Allow tagging with uncommitted changes')
    .action(async (opts) => {
      try {
        // Validate version
        let version: SemVer
        try {
          version = SemVer.parse(opts.tagVersion)
        } catch {
          console.error(`Invalid semver: "${opts.tagVersion}"`)
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
          await git.deleteTag(tagName)
          console.log(`Deleted existing tag ${tagName}`)
        }

        // Update package.json version
        const config = await loadConfig('.bumpcraftrc.json')
        const versionSource = createVersionSource(config.versionSource)
        await versionSource.write(version)
        console.log(`Updated ${config.versionSource} to ${version.toString()}`)

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

        // Commit the version change so the tag points to a commit WITH the new version
        try {
          execSync('git add package.json .bumpcraft/', { stdio: 'pipe' })
          execSync(`git commit -m "chore(release): baseline ${version.toString()}"`, { stdio: 'pipe' })
          console.log(`Committed version change`)
        } catch {
          // If nothing to commit (e.g. version already matched), that's fine
        }

        // Create git tag on the commit that has the correct version
        await git.createTag(tagName, opts.message)

        // Verify the tag was actually created
        if (await git.tagExists(tagName)) {
          console.log(`Created tag ${tagName}`)
        } else {
          console.error(`Failed to create tag ${tagName}`)
          process.exit(1)
          return
        }

        console.log(`\nBaseline release ${tagName} created successfully.`)
        console.log(`Future \`bumpcraft release\` will only look at commits after this point.`)

      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
