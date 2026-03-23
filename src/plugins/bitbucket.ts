import type { BumpcraftPlugin, PipelineContext } from '../pipeline/types.js'

export const bitbucketPlugin: BumpcraftPlugin = {
  name: 'bumpcraft-plugin-bitbucket',
  stage: 'release',
  async execute(context: PipelineContext): Promise<PipelineContext> {
    const user = process.env.BITBUCKET_USER
    const pass = process.env.BITBUCKET_APP_PASSWORD
    if (!user || !pass) {
      context.logger.warn('BITBUCKET_USER/BITBUCKET_APP_PASSWORD not set — skipping Bitbucket release')
      return context
    }

    if (!context.nextVersion) {
      context.logger.warn('bitbucket plugin: nextVersion is null, skipping')
      return context
    }

    const opts = context.config.pluginOptions['bumpcraft-plugin-bitbucket'] as
      { repo?: string } | undefined
    const repo = opts?.repo ?? process.env.BITBUCKET_REPO_FULL_NAME

    if (!repo) {
      context.logger.warn('bitbucket plugin: no repo — skipping')
      return context
    }

    const version = context.nextVersion.toString()
    const tagName = `v${version}`

    // Bitbucket doesn't have a "releases" API like GitHub/GitLab.
    // Create a tag via the refs/tags API with a commit message as annotation.
    const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${repo}/refs/tags`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: tagName,
        target: { hash: 'HEAD' },
        message: context.changelogOutput ?? `Release ${tagName}`
      })
    })

    if (!res.ok) {
      if (res.status === 409) {
        context.logger.warn(`Bitbucket tag ${tagName} already exists`)
        return context
      }
      throw new Error(`Bitbucket tag creation failed: ${res.status} ${res.statusText}`)
    }

    return {
      ...context,
      releaseResult: { url: `https://bitbucket.org/${repo}/src/${tagName}`, id: tagName }
    }
  }
}
