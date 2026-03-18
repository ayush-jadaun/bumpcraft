import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'

export interface ReleaseGroup {
  name: string
  createdAt: string
  commits: string[]
}

export class GroupManager {
  constructor(private readonly dir: string) {}

  private filePath(name: string): string {
    return join(this.dir, `${name}.json`)
  }

  async create(name: string): Promise<ReleaseGroup> {
    await mkdir(this.dir, { recursive: true })
    try {
      await readFile(this.filePath(name))
      throw new Error(`Group "${name}" already exists`)
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('already exists')) throw e
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    const group: ReleaseGroup = { name, createdAt: new Date().toISOString(), commits: [] }
    await writeFile(this.filePath(name), JSON.stringify(group, null, 2), 'utf-8')
    return group
  }

  async get(name: string): Promise<ReleaseGroup | null> {
    try {
      const content = await readFile(this.filePath(name), 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  async addCommits(name: string, commits: string[]): Promise<void> {
    const group = await this.get(name)
    if (!group) throw new Error(`Group "${name}" not found`)
    group.commits.push(...commits)
    await writeFile(this.filePath(name), JSON.stringify(group, null, 2), 'utf-8')
  }

  async list(): Promise<ReleaseGroup[]> {
    try {
      const files = await readdir(this.dir)
      const groups = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(f => this.get(f.replace('.json', '')))
      )
      return groups.filter((g): g is ReleaseGroup => g !== null)
    } catch {
      return []
    }
  }

  async delete(name: string): Promise<void> {
    await unlink(this.filePath(name))
  }
}
