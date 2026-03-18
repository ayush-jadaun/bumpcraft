import { readFile, writeFile } from 'fs/promises'
import { BumpcraftError, ErrorCode } from './errors.js'
import { SemVer } from './semver.js'
import { GitClient } from './git-client.js'

export interface VersionSource {
  read(): Promise<SemVer>
  write(version: SemVer): Promise<void>
}

export class PackageJsonSource implements VersionSource {
  constructor(private readonly path = 'package.json') {}

  async read(): Promise<SemVer> {
    try {
      const content = await readFile(this.path, 'utf-8')
      const pkg = JSON.parse(content)
      return SemVer.parse(pkg.version ?? '0.0.0')
    } catch (e) {
      throw new BumpcraftError(ErrorCode.INVALID_VERSION, `Cannot read ${this.path}: ${e}`)
    }
  }

  async write(version: SemVer): Promise<void> {
    try {
      const content = await readFile(this.path, 'utf-8')
      const pkg = JSON.parse(content)
      pkg.version = version.toString()
      await writeFile(this.path, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
    } catch (e) {
      throw new BumpcraftError(ErrorCode.CONFIG_ERROR, `Cannot write ${this.path}: ${e}`)
    }
  }
}

export class GitTagSource implements VersionSource {
  constructor(private readonly git = new GitClient()) {}

  async read(): Promise<SemVer> {
    const tag = await this.git.getLatestTag()
    if (!tag) return SemVer.parse('0.0.0')
    return SemVer.parse(tag.replace(/^v/, ''))
  }

  async write(version: SemVer): Promise<void> {
    await this.git.createTag(`v${version.toString()}`, `Release v${version.toString()}`)
  }
}

export function createVersionSource(type: 'package.json' | 'git-tag'): VersionSource {
  if (type === 'git-tag') return new GitTagSource()
  return new PackageJsonSource()
}
