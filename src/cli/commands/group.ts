import type { Command } from 'commander'
import { GroupManager } from '../../groups/group-manager.js'
import { GitClient } from '../../core/git-client.js'
import { join } from 'path'

export function registerGroup(program: Command) {
  const cmd = program.command('group').description('Manage release groups')
  const manager = new GroupManager(join('.bumpcraft', 'groups'))

  cmd.command('create <name>').action(async (name: string) => {
    await manager.create(name)
    console.log(`Created group "${name}"`)
  })

  cmd.command('add <name>').description('Add current commits to group').action(async (name: string) => {
    const git = new GitClient()
    const tag = await git.getLatestTag()
    const commits = await git.getCommitsSince(tag)
    await manager.addCommits(name, commits)
    console.log(`Added ${commits.length} commits to group "${name}"`)
  })

  cmd.command('status <name>').action(async (name: string) => {
    const group = await manager.get(name)
    if (!group) { console.log(`Group "${name}" not found`); return }
    console.log(`Group: ${group.name}`)
    console.log(`Commits: ${group.commits.length}`)
    group.commits.forEach(c => console.log(` - ${c}`))
  })

  cmd.command('list').action(async () => {
    const groups = await manager.list()
    if (!groups.length) { console.log('No groups found.'); return }
    groups.forEach(g => console.log(`- ${g.name} (${g.commits.length} commits)`))
  })

  cmd.command('release <name>').action(async (name: string) => {
    const group = await manager.get(name)
    if (!group) { console.log(`Group "${name}" not found`); return }
    if (!group.commits.length) { console.log(`Group "${name}" has no commits`); return }
    const { runReleaseWithCommits } = await import('../../index.js')
    const result = await runReleaseWithCommits(group.commits, { dryRun: false })
    console.log(`Released group "${name}" as ${result.nextVersion}`)
    await manager.delete(name)
  })
}
