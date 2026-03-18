import { simpleGit, SimpleGit } from 'simple-git'
import { BumpcraftError, ErrorCode } from './errors.js'
import { SemVer } from './semver.js'

export class GitClient {
  private git: SimpleGit

  constructor(cwd = process.cwd()) {
    this.git = simpleGit(cwd)
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const result = await this.git.revparse(['--abbrev-ref', 'HEAD'])
      return result.trim()
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to get branch: ${e}`)
    }
  }

  async getLatestTag(): Promise<string | null> {
    try {
      const tags = await this.git.tags(['--sort=-version:refname'])
      const semverTags = tags.all.filter(t => {
        try { SemVer.parse(t.replace(/^v/, '')); return true } catch { return false }
      })
      return semverTags[0] ?? null
    } catch {
      return null
    }
  }

  async getCommitsSince(ref: string | null): Promise<string[]> {
    try {
      const range = ref ? `${ref}..HEAD` : 'HEAD'
      const log = await this.git.log([range, '--format=%H %s%n%b'])
      return log.all.map(c => c.hash + ' ' + c.message)
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to get commits: ${e}`)
    }
  }

  async createTag(tag: string, message: string): Promise<void> {
    try {
      await this.git.addAnnotatedTag(tag, message)
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to create tag: ${e}`)
    }
  }
}
