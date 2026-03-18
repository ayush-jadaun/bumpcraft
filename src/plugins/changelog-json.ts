import type { BumpcraftPlugin, PipelineContext } from '../pipeline/types.js'

export const changelogJsonPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-changelog-json',
  stage: 'changelog',
  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (context.changelogOutput) return context
    const { parsedCommits, nextVersion, currentVersion } = context
    const entry = {
      version: nextVersion?.toString() ?? 'unknown',
      previousVersion: currentVersion.toString(),
      date: new Date().toISOString(),
      commits: parsedCommits
    }
    return { ...context, changelogOutput: JSON.stringify(entry, null, 2) }
  }
}
