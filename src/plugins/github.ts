import type { BumpcraftPlugin, PipelineContext } from '../pipeline/types.js'

export const githubPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-github',
  stage: 'release',
  async execute(context: PipelineContext): Promise<PipelineContext> {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      context.logger.warn('GITHUB_TOKEN not set — skipping GitHub release creation')
      return context
    }

    const opts = context.config.pluginOptions['bumpcraft-plugin-github'] as
      { repo?: string } | undefined
    const repo = opts?.repo ?? process.env.GITHUB_REPOSITORY

    if (!repo) {
      context.logger.warn('No repo configured for github plugin — skipping')
      return context
    }

    const version = context.nextVersion?.toString()
    const body = context.changelogOutput ?? ''

    const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'bumpcraft'
      },
      body: JSON.stringify({
        tag_name: `v${version}`,
        name: `v${version}`,
        body,
        draft: false,
        prerelease: context.nextVersion?.preRelease !== null
      })
    })

    if (!res.ok) {
      context.logger.error(`GitHub release failed: ${res.status} ${res.statusText}`)
      return context
    }

    const data = await res.json() as { html_url: string; id: number }
    return {
      ...context,
      releaseResult: { url: data.html_url, id: String(data.id) }
    }
  }
}
