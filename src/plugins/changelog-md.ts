import type { BumpcraftPlugin, ParsedCommit, PipelineContext } from '../pipeline/types.js'

const TYPE_LABELS: Record<string, string> = {
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance',
  refactor: 'Refactoring',
  docs: 'Documentation'
}

function formatEntry(c: ParsedCommit): string {
  const scope = c.scope ? `**${c.scope}:** ` : ''
  const breaking = c.breaking ? ' BREAKING' : ''
  return `- ${scope}${c.subject}${breaking} ([${c.hash.slice(0, 7)}])`
}

export const changelogMdPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-changelog-md',
  stage: 'changelog',
  async execute(context: PipelineContext): Promise<PipelineContext> {
    // Respect a pre-authored changelog (e.g. from interactive edit mode)
    if (context.changelogOutput) return context
    const { parsedCommits, nextVersion } = context
    const date = new Date().toISOString().split('T')[0]
    const header = `## ${nextVersion?.toString() ?? 'Unreleased'} (${date})\n`

    const grouped = new Map<string, ParsedCommit[]>()
    for (const commit of parsedCommits) {
      if (!grouped.has(commit.type)) grouped.set(commit.type, [])
      grouped.get(commit.type)!.push(commit)
    }

    const sections = [...grouped.entries()]
      .filter(([type]) => type !== 'chore')
      .map(([type, commits]) => {
        const label = TYPE_LABELS[type] ?? type
        const entries = commits.map(formatEntry).join('\n')
        return `### ${label}\n\n${entries}`
      })
      .join('\n\n')

    const changelogOutput = `${header}\n${sections}\n`
    return { ...context, changelogOutput }
  }
}
