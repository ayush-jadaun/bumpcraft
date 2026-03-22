import type { BumpcraftPlugin, ParsedCommit, PipelineContext } from '../pipeline/types.js'
import { resolveBump } from '../core/bump-resolver.js'

const COMMIT_REGEX = /^([a-fA-F0-9]+)\s+(\w+)(\([\w/-]+\))?(!)?\s*:\s*(.+)/

function parseCommit(raw: string): ParsedCommit | null {
  const lines = raw.split('\n')
  const header = lines[0]
  const body = lines.slice(1).join('\n').trim() || null

  const match = COMMIT_REGEX.exec(header)
  if (!match) return null

  const breaking = match[4] === '!' || (body?.includes('BREAKING CHANGE:') ?? false)

  return {
    hash: match[1],
    type: match[2],
    scope: match[3]?.replace(/[()]/g, '') ?? null,
    subject: match[5].trim(),
    body,
    breaking,
    raw
  }
}

export const conventionalCommitsPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-conventional-commits',
  stage: 'parse',
  async execute(context: PipelineContext): Promise<PipelineContext> {
    const parsedCommits = context.rawCommits
      .map(parseCommit)
      .filter((c): c is ParsedCommit => c !== null)

    const bumpType = resolveBump(parsedCommits, context.config.commitTypes)

    return { ...context, parsedCommits, bumpType }
  }
}
