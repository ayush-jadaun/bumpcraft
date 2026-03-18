import { z } from 'zod'
import { readFile } from 'fs/promises'
import { BumpcraftError, ErrorCode } from './errors.js'

const PluginEntrySchema = z.union([
  z.string(),
  z.tuple([z.string(), z.record(z.unknown())])
])

const ConfigSchema = z.object({
  versionSource: z.enum(['package.json', 'git-tag']).default('package.json'),
  plugins: z.array(PluginEntrySchema).default([]),
  branches: z.object({
    release: z.array(z.string()).default(['main', 'master']),
    preRelease: z.record(z.string()).default({})
  }).default({}),
  commitTypes: z.record(z.enum(['major', 'minor', 'patch', 'none'])).default({
    feat: 'minor',
    fix: 'patch',
    perf: 'patch',
    refactor: 'none',
    chore: 'none',
    docs: 'none',
    test: 'none',
    style: 'none'
  }),
  policies: z.object({
    requireApproval: z.array(z.string()).default([]),
    autoRelease: z.array(z.string()).default(['patch', 'minor', 'major']),
    freezeAfter: z.string().nullable().default(null),
    maxBumpPerDay: z.number().nullable().default(null)
  }).default({}),
  pluginOptions: z.record(z.record(z.unknown())).default({})
})

export type BumpcraftConfig = z.infer<typeof ConfigSchema>
export type PluginEntry = z.infer<typeof PluginEntrySchema>

export const defaultConfig: BumpcraftConfig = ConfigSchema.parse({})

export async function loadConfig(configPath: string): Promise<BumpcraftConfig> {
  let raw: Record<string, unknown> = {}
  try {
    const content = await readFile(configPath, 'utf-8')
    raw = JSON.parse(content)
  } catch {
    // file not found or unreadable — use defaults
  }

  const pluginOptions: Record<string, Record<string, unknown>> = {}
  const plugins = (raw.plugins as PluginEntry[] | undefined) ?? []
  for (const entry of plugins) {
    if (Array.isArray(entry)) {
      pluginOptions[entry[0]] = entry[1] as Record<string, unknown>
    }
  }

  const result = ConfigSchema.safeParse({ ...raw, pluginOptions })
  if (!result.success) {
    throw new BumpcraftError(
      ErrorCode.CONFIG_ERROR,
      `Invalid config: ${result.error.message}`
    )
  }
  return result.data
}
