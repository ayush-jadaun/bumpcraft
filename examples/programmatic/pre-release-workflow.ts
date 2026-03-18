/**
 * Example: Pre-release workflow for staging environments.
 *
 * Creates beta versions on the develop branch, then promotes
 * to stable on main. Common in teams with staging/production environments.
 *
 * Run: npx tsx examples/programmatic/pre-release-workflow.ts
 */

import { runRelease, currentVersion } from 'bumpcraft'

async function main() {
  const version = await currentVersion()
  console.log(`Current version: ${version}`)

  // On develop branch: create beta pre-releases
  // On main branch: create stable releases
  //
  // This is handled automatically if your .bumpcraftrc.json has:
  //   "branches": {
  //     "release": ["main"],
  //     "preRelease": { "develop": "beta", "staging": "rc" }
  //   }

  // Manual approach: force a beta pre-release
  const betaResult = await runRelease({
    dryRun: true,
    preRelease: 'beta'
  })

  if (betaResult.bumpType === 'none') {
    console.log('No changes to release.')
    return
  }

  console.log(`Beta preview: ${betaResult.nextVersion}`)
  // Output: 1.2.0-beta.1, 1.2.0-beta.2, etc.

  // Promote to stable (remove pre-release tag)
  // Only do this on the main branch after QA
  const isMain = process.env.BRANCH === 'main'
  if (isMain) {
    const stableResult = await runRelease({
      forceBump: betaResult.bumpType as 'major' | 'minor' | 'patch'
    })
    console.log(`Stable release: ${stableResult.nextVersion}`)
  } else {
    const beta = await runRelease({ preRelease: 'beta' })
    console.log(`Beta release: ${beta.nextVersion}`)
  }
}

main().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
