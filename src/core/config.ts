import { z } from 'zod'
import { readFile, readdir, stat } from 'fs/promises'
import { join, basename } from 'path'
import { BumpcraftError, ErrorCode } from './errors.js'

const PluginEntrySchema = z.union([
  z.string(),
  z.tuple([z.string(), z.record(z.string(), z.unknown())])
])

const MonorepoPackageSchema = z.object({
  path: z.string(),
  tagFormat: z.string().optional(),
  private: z.boolean().optional()
})

const LinkedGroupSchema = z.array(z.string())

const HooksSchema = z.object({
  beforeRelease: z.string().optional(),
  afterRelease: z.string().optional(),
  beforeBump: z.string().optional(),
  afterBump: z.string().optional(),
  beforePublish: z.string().optional(),
  afterPublish: z.string().optional()
}).default({})

const ConfigSchema = z.object({
  monorepo: z.record(z.string(), MonorepoPackageSchema).nullable().default(null),
  linked: z.array(LinkedGroupSchema).default([]),
  changelogTemplate: z.string().nullable().default(null),
  hooks: HooksSchema,
  versionSource: z.enum(['package.json', 'git-tag']).default('package.json'),
  plugins: z.array(PluginEntrySchema).default([
    'bumpcraft-plugin-conventional-commits',
    'bumpcraft-plugin-changelog-md'
  ]),
  branches: z.object({
    release: z.array(z.string()).default(['main', 'master']),
    preRelease: z.record(z.string(), z.string()).default({})
  }).default(() => ({ release: ['main', 'master'], preRelease: {} })),
  commitTypes: z.record(z.string(), z.enum(['major', 'minor', 'patch', 'none'])).default({
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
    freezeAfter: z.string()
      .refine(
        val => /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+\d{2}:\d{2}$/i.test(val),
        { message: 'freezeAfter must be "<day> HH:MM" (e.g. "friday 17:00")' }
      )
      .nullable().default(null),
    maxBumpPerDay: z.number().nullable().default(null)
  }).default(() => ({ requireApproval: [], autoRelease: ['patch', 'minor', 'major'], freezeAfter: null, maxBumpPerDay: null })),
  pluginOptions: z.record(z.string(), z.record(z.string(), z.unknown())).default({})
})

export type BumpcraftConfig = z.infer<typeof ConfigSchema>
export type PluginEntry = z.infer<typeof PluginEntrySchema>

export const defaultConfig: BumpcraftConfig = ConfigSchema.parse({})

export async function loadConfig(configPath: string): Promise<BumpcraftConfig> {
  let raw: Record<string, unknown> = {}
  try {
    const content = await readFile(configPath, 'utf-8')
    raw = JSON.parse(content)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new BumpcraftError(ErrorCode.CONFIG_ERROR, `Failed to read config "${configPath}": ${e}`)
    }
    // file not found — use defaults
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

  // Auto-detect monorepo from npm/pnpm/yarn workspaces if not explicitly configured
  if (!result.data.monorepo) {
    let workspaces: string[] | undefined

    // 1. Try package.json workspaces (npm/yarn)
    try {
      const rootPkg = JSON.parse(await readFile('package.json', 'utf-8'))
      workspaces = Array.isArray(rootPkg.workspaces)
        ? rootPkg.workspaces
        : rootPkg.workspaces?.packages
    } catch { /* */ }

    // 2. Try pnpm-workspace.yaml
    if (!workspaces?.length) {
      try {
        const yamlContent = await readFile('pnpm-workspace.yaml', 'utf-8')
        // Simple YAML parser for the packages field — handles:
        //   packages:
        //     - 'packages/*'
        //     - 'apps/*'
        const lines = yamlContent.split('\n')
        let inPackages = false
        const parsed: string[] = []
        for (const line of lines) {
          if (/^packages\s*:/.test(line)) {
            inPackages = true
            continue
          }
          if (inPackages) {
            const m = line.match(/^\s+-\s+['"]?([^'"]+)['"]?\s*$/)
            if (m) {
              parsed.push(m[1].trim())
            } else if (/^\S/.test(line)) {
              break // next top-level key
            }
          }
        }
        if (parsed.length > 0) workspaces = parsed
      } catch { /* no pnpm-workspace.yaml */ }
    }

    if (workspaces?.length) {
      const detected: Record<string, { path: string }> = {}
      for (const pattern of workspaces) {
        if (pattern.endsWith('/*')) {
          const dir = pattern.slice(0, -2)
          try {
            const entries = await readdir(dir)
            for (const entry of entries) {
              const full = join(dir, entry)
              try {
                const s = await stat(full)
                if (s.isDirectory()) {
                  try {
                    await readFile(join(full, 'package.json'), 'utf-8')
                    detected[entry] = { path: full }
                  } catch { /* no package.json */ }
                }
              } catch { /* */ }
            }
          } catch { /* dir doesn't exist */ }
        } else if (!pattern.includes('*')) {
          try {
            await readFile(join(pattern, 'package.json'), 'utf-8')
            detected[basename(pattern)] = { path: pattern }
          } catch { /* */ }
        }
      }
      if (Object.keys(detected).length > 0) {
        result.data.monorepo = detected
      }
    }
  }

  return result.data
}
