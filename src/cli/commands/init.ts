import type { Command } from 'commander'
import { writeFile, access } from 'fs/promises'

const DEFAULT_CONFIG = {
  versionSource: 'package.json',
  plugins: ['bumpcraft-plugin-conventional-commits', 'bumpcraft-plugin-changelog-md'],
  branches: { release: ['main', 'master'], preRelease: { develop: 'beta' } },
  commitTypes: { feat: 'minor', fix: 'patch', perf: 'patch' },
  policies: { requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null }
}

export function registerInit(program: Command) {
  program
    .command('init')
    .description('Scaffold .bumpcraftrc.json')
    .action(async () => {
      try {
        await access('.bumpcraftrc.json')
        console.log('.bumpcraftrc.json already exists')
      } catch {
        await writeFile('.bumpcraftrc.json', JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8')
        console.log('Created .bumpcraftrc.json')
      }
    })
}
