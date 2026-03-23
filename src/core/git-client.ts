import { simpleGit, SimpleGit } from 'simple-git'
import { BumpcraftError, ErrorCode } from './errors.js'
import { SemVer } from './semver.js'

const MAX_COMMITS_NO_TAG = 500

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
      const args = ref
        ? ['log', `${ref}..HEAD`, '--format=%H %s%n%b%x00']
        : ['log', 'HEAD', `--max-count=${MAX_COMMITS_NO_TAG}`, '--format=%H %s%n%b%x00']
      const output = await this.git.raw(args)
      return output.split('\0').map(s => s.trim()).filter(s => s.length > 0)
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to get commits: ${e}`)
    }
  }

  async isShallowClone(): Promise<boolean> {
    try {
      const result = await this.git.raw(['rev-parse', '--is-shallow-repository'])
      return result.trim() === 'true'
    } catch {
      return false
    }
  }

  async getTagsMatching(pattern: string): Promise<string[]> {
    try {
      const tags = await this.git.tags(['--sort=-version:refname', '-l', pattern])
      return tags.all
    } catch {
      return []
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

  async pushTag(tag: string): Promise<void> {
    try {
      await this.git.push('origin', tag)
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to push tag ${tag}: ${e}`)
    }
  }

  async push(): Promise<void> {
    try {
      await this.git.push()
    } catch (e) {
      throw new BumpcraftError(ErrorCode.GIT_ERROR, `Failed to push: ${e}`)
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
