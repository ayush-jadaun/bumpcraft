import type { BumpcraftPlugin, PipelineContext } from '../pipeline/types.js'

export const gitlabPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-gitlab',
  stage: 'release',
  async execute(context: PipelineContext): Promise<PipelineContext> {
    const token = process.env.GITLAB_TOKEN ?? process.env.CI_JOB_TOKEN
    if (!token) {
      context.logger.warn('GITLAB_TOKEN not set — skipping GitLab release creation')
      return context
    }

    if (!context.nextVersion) {
      context.logger.warn('gitlab plugin: nextVersion is null, skipping')
      return context
    }

    const opts = context.config.pluginOptions['bumpcraft-plugin-gitlab'] as
      { projectId?: string; host?: string } | undefined
    const projectId = opts?.projectId ?? process.env.CI_PROJECT_ID
    const host = opts?.host ?? process.env.CI_SERVER_URL ?? 'https://gitlab.com'

    if (!projectId) {
      context.logger.warn('gitlab plugin: no project ID — skipping')
      return context
    }

    const version = context.nextVersion.toString()
    const tagName = `v${version}`
    const body = context.changelogOutput ?? ''

    const res = await fetch(`${host}/api/v4/projects/${projectId}/releases`, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: tagName,
        description: body
      })
    })

    if (!res.ok) {
      if (res.status === 409) {
        context.logger.warn(`GitLab release ${tagName} already exists`)
        return context
      }
      throw new Error(`GitLab release failed: ${res.status} ${res.statusText}`)
    }

    const data = await res.json() as { _links: { self: string } }
    return {
      ...context,
      releaseResult: { url: data._links?.self ?? `${host}/projects/${projectId}/releases/${tagName}`, id: tagName }
    }
  }
}
