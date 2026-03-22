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
      // %H %s = hash + subject; %n%b = body (multi-line); %x00 = NUL separator between commits
      // NUL cannot appear in commit messages, making it a reliable record separator
      const output = await this.git.raw(['log', range, '--format=%H %s%n%b%x00'])
      return output.split('\0').map(s => s.trim()).filter(s => s.length > 0)
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to get commits: ${e}`)
    }
  }

  async tagExists(tag: string): Promise<boolean> {
    try {
      await this.git.raw(['rev-parse', tag])
      return true
    } catch {
      return false
    }
  }

  async isDirty(): Promise<boolean> {
    try {
      const status = await this.git.status()
      return status.files.length > 0
    } catch {
      return false
    }
  }

  async hasCommits(): Promise<boolean> {
    try {
      await this.git.raw(['rev-parse', 'HEAD'])
      return true
    } catch {
      return false
    }
  }

  async createTag(tag: string, message: string): Promise<void> {
    try {
      await this.git.addAnnotatedTag(tag, message)
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to create tag: ${e}`)
    }
  }

  async deleteTag(tag: string): Promise<void> {
    try {
      await this.git.raw(['tag', '-d', tag])
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to delete tag: ${e}`)
    }
  }
}
