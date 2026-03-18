/**
 * Example: Use Bumpcraft as a library in your own release script.
 *
 * This is useful when you need custom logic around releases —
 * e.g., notify Slack, update a database, deploy after release.
 *
 * Run: npx tsx examples/programmatic/release-script.ts
 */

import { runRelease, currentVersion } from 'bumpcraft'
import type { BumpType } from 'bumpcraft'

async function main() {
  const version = await currentVersion()
  console.log(`Current version: ${version}`)

  // 1. Preview
  const preview = await runRelease({ dryRun: true })

  if (preview.bumpType === 'none') {
    console.log('Nothing to release.')
    return
  }

  console.log(`Will bump: ${preview.bumpType} → ${preview.nextVersion}`)
  console.log(`Changelog:\n${preview.changelogOutput}`)

  // 2. Custom pre-release logic
  console.log('Running pre-release checks...')
  // await runTests()
  // await checkDeploymentWindow()
  // await notifySlack(`Starting release ${preview.nextVersion}...`)

  // 3. Release
  const result = await runRelease({
    // preRelease: 'beta',       // uncomment for pre-release
    // forceBump: 'minor',       // uncomment to override
  })

  console.log(`Released: ${result.nextVersion}`)

  // 4. Custom post-release logic
  // await notifySlack(`Released ${result.nextVersion}!`)
  // await triggerDeploy(result.nextVersion)
  // await updateStatusPage(result.nextVersion)

  if (result.releaseResult?.url) {
    console.log(`GitHub release: ${result.releaseResult.url}`)
  }
}

main().catch(err => {
  console.error('Release failed:', err.message)
  process.exit(1)
})
