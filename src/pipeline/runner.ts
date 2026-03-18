import type { BumpcraftPlugin, PipelineContext } from './types.js'
import { BumpcraftError, ErrorCode } from '../core/errors.js'

const STAGE_ORDER = ['parse', 'resolve', 'changelog', 'release', 'notify'] as const
type Stage = typeof STAGE_ORDER[number]

export class PipelineRunner {
  private pluginsByStage: Map<Stage, BumpcraftPlugin[]>

  constructor(plugins: BumpcraftPlugin[]) {
    this.pluginsByStage = new Map()
    for (const stage of STAGE_ORDER) {
      this.pluginsByStage.set(stage, plugins.filter(p => p.stage === stage))
    }
  }

  async run(context: PipelineContext): Promise<PipelineContext> {
    let ctx = context

    for (const stage of STAGE_ORDER) {
      if (stage === 'changelog' && ctx.bumpType === 'none') break
      if ((stage === 'release' || stage === 'notify') && ctx.dryRun) continue

      const plugins = this.pluginsByStage.get(stage) ?? []
      for (const plugin of plugins) {
        try {
          ctx = await plugin.execute(ctx)
        } catch (err) {
          if (err instanceof BumpcraftError) throw err
          throw new BumpcraftError(
            ErrorCode.PLUGIN_FAILED,
            `Plugin "${plugin.name}" failed at stage "${stage}": ${err}`,
            { stage, plugin: plugin.name, originalError: String(err) }
          )
        }
      }
    }

    return ctx
  }
}
