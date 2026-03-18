import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GroupManager } from '../../src/groups/group-manager.js'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let dir: string
let manager: GroupManager

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-groups-'))
  manager = new GroupManager(join(dir, 'groups'))
})

afterEach(() => rmSync(dir, { recursive: true }))

describe('GroupManager', () => {
  it('creates a new group', async () => {
    await manager.create('v3-launch')
    const group = await manager.get('v3-launch')
    expect(group?.name).toBe('v3-launch')
    expect(group?.commits).toEqual([])
  })

  it('throws when creating duplicate group', async () => {
    await manager.create('v3-launch')
    await expect(manager.create('v3-launch')).rejects.toThrow()
  })

  it('adds commits to group', async () => {
    await manager.create('v3-launch')
    await manager.addCommits('v3-launch', ['abc feat: add thing'])
    const group = await manager.get('v3-launch')
    expect(group?.commits).toHaveLength(1)
  })

  it('lists all groups', async () => {
    await manager.create('group-a')
    await manager.create('group-b')
    const groups = await manager.list()
    expect(groups.map(g => g.name)).toContain('group-a')
    expect(groups.map(g => g.name)).toContain('group-b')
  })

  it('deletes a group', async () => {
    await manager.create('v3-launch')
    await manager.delete('v3-launch')
    expect(await manager.get('v3-launch')).toBeNull()
  })

  it('delete on non-existent group does not throw', async () => {
    await expect(manager.delete('no-such-group')).resolves.toBeUndefined()
  })

  it('rejects group names with path traversal characters', async () => {
    await expect(manager.create('../evil')).rejects.toThrow(/invalid group name/i)
    await expect(manager.get('../../etc')).rejects.toThrow(/invalid group name/i)
  })
})
