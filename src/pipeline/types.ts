import type { SemVer } from '../core/semver.js'
import type { BumpcraftConfig } from '../core/config.js'
import type { Logger } from '../core/logger.js'

export interface ParsedCommit {
  hash: string
  type: string
  scope: string | null
  subject: string
  body: string | null
  breaking: boolean
  raw: string
}

export type BumpType = 'major' | 'minor' | 'patch' | 'none'

export interface PipelineContext {
  rawCommits: string[]
  parsedCommits: ParsedCommit[]
  currentVersion: SemVer
  nextVersion: SemVer | null
  bumpType: BumpType
  changelogOutput: string | null
  releaseResult: { url?: string; id?: string } | null
  config: BumpcraftConfig
  dryRun: boolean
  logger: Logger
}

export interface BumpcraftPlugin {
  name: string
  stage: 'parse' | 'resolve' | 'changelog' | 'release' | 'notify'
  execute(context: PipelineContext): Promise<PipelineContext>
}
