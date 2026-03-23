import type { BumpcraftPlugin, ParsedCommit, PipelineContext } from '../pipeline/types.js'

const TYPE_LABELS: Record<string, string> = {
  feat: '🚀 Features',
  fix: '🐛 Bug Fixes',
  perf: '⚡ Performance Improvements',
  refactor: '♻️ Code Refactoring',
  docs: '📚 Documentation',
  test: '✅ Tests',
  style: '💄 Styling'
}

// Display order — most important first
const TYPE_ORDER = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'style']

function formatEntry(c: ParsedCommit, repoUrl: string | null): string {
  const scope = c.scope ? `**${c.scope}:** ` : ''
  const hash = c.hash.slice(0, 7)
  const link = repoUrl ? `[${hash}](${repoUrl}/commit/${c.hash})` : hash
  return `- ${scope}${c.subject} (${link})`
}

export const changelogMdPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-changelog-md',
  stage: 'changelog',
  async execute(context: PipelineContext): Promise<PipelineContext> {
    // Respect a pre-authored changelog (e.g. from interactive edit mode)
    if (context.changelogOutput) return context
    const { parsedCommits, nextVersion, currentVersion } = context

    // Custom template: replace {version}, {date}, {commits} placeholders
    if (context.config.changelogTemplate) {
      const date = new Date().toISOString().split('T')[0]
      const version = nextVersion?.toString() ?? 'Unreleased'
      const commitLines = parsedCommits
        .map(c => `- ${c.scope ? `**${c.scope}:** ` : ''}${c.subject}${c.breaking ? ' BREAKING' : ''}`)
        .join('\n')
      const output = context.config.changelogTemplate
        .replace(/\{version\}/g, version)
        .replace(/\{date\}/g, date)
        .replace(/\{commits\}/g, commitLines)
        .replace(/\{previousVersion\}/g, currentVersion.toString())
      return { ...context, changelogOutput: output }
    }
    const date = new Date().toISOString().split('T')[0]
    const version = nextVersion?.toString() ?? 'Unreleased'
    const prev = currentVersion.toString()

    // Resolve repo URL for commit links
    const ghOpts = context.config.pluginOptions['bumpcraft-plugin-github'] as { repo?: string } | undefined
    const repo = ghOpts?.repo ?? process.env.GITHUB_REPOSITORY ?? null
    const repoUrl = repo ? `https://github.com/${repo}` : null

    // Header with optional compare link
    const compareLink = repoUrl ? ` ([compare](${repoUrl}/compare/v${prev}...v${version}))` : ''
    const header = `## [${version}](${repoUrl ? `${repoUrl}/releases/tag/v${version}` : ''}) (${date})${compareLink}`

    const parts: string[] = [header]

    // Breaking changes — prominent section at the top
    const breakingCommits = parsedCommits.filter(c => c.breaking)
    if (breakingCommits.length > 0) {
      parts.push('')
      parts.push('### ⚠ BREAKING CHANGES')
      parts.push('')
      for (const c of breakingCommits) {
        const scope = c.scope ? `**${c.scope}:** ` : ''
        const detail = c.body?.match(/BREAKING CHANGE:\s*(.+)/)?.[1] ?? c.subject
        const hash = c.hash.slice(0, 7)
        const link = repoUrl ? `[${hash}](${repoUrl}/commit/${c.hash})` : hash
        parts.push(`- ${scope}${detail} (${link})`)
      }
    }

    // Group commits by type
    const grouped = new Map<string, ParsedCommit[]>()
    for (const commit of parsedCommits) {
      if (!grouped.has(commit.type)) grouped.set(commit.type, [])
      grouped.get(commit.type)!.push(commit)
    }

    // Emit sections in defined order
    const emittedTypes = new Set<string>()
    for (const type of TYPE_ORDER) {
      const commits = grouped.get(type)
      if (!commits?.length || type === 'chore') continue
      emittedTypes.add(type)
      const label = TYPE_LABELS[type] ?? type
      parts.push('')
      parts.push(`### ${label}`)
      parts.push('')
      for (const c of commits) {
        parts.push(formatEntry(c, repoUrl))
      }
    }

    // Any types not in TYPE_ORDER
    for (const [type, commits] of grouped) {
      if (emittedTypes.has(type) || type === 'chore') continue
      const label = TYPE_LABELS[type] ?? type
      parts.push('')
      parts.push(`### ${label}`)
      parts.push('')
      for (const c of commits) {
        parts.push(formatEntry(c, repoUrl))
      }
    }

    parts.push('')
    const changelogOutput = parts.join('\n')
    return { ...context, changelogOutput }
  }
}
