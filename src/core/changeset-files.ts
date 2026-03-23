import { readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

export interface ChangesetFile {
  id: string
  packages: Record<string, 'major' | 'minor' | 'patch'>
  summary: string
}

const CHANGESET_DIR = '.changeset'

function parseChangesetMd(content: string): ChangesetFile | null {
  // Format:
  // ---
  // "auth": minor
  // "api": patch
  // ---
  // Summary of the change
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return null

  const frontmatter = match[1].trim()
  const summary = match[2].trim()
  const packages: Record<string, 'major' | 'minor' | 'patch'> = {}

  for (const line of frontmatter.split('\n')) {
    const m = line.match(/^"?([^"]+)"?\s*:\s*(major|minor|patch)$/)
    if (m) packages[m[1]] = m[2] as 'major' | 'minor' | 'patch'
  }

  if (Object.keys(packages).length === 0) return null
  return { id: '', packages, summary }
}

export async function readChangesets(): Promise<ChangesetFile[]> {
  const dir = CHANGESET_DIR
  try {
    const files = await readdir(dir)
    const changesets: ChangesetFile[] = []
    for (const file of files) {
      if (!file.endsWith('.md') || file === 'README.md') continue
      try {
        const content = await readFile(join(dir, file), 'utf-8')
        const parsed = parseChangesetMd(content)
        if (parsed) {
          parsed.id = file.replace('.md', '')
          changesets.push(parsed)
        }
      } catch { /* skip unreadable */ }
    }
    return changesets
  } catch {
    return []
  }
}

export async function createChangeset(
  packages: Record<string, 'major' | 'minor' | 'patch'>,
  summary: string
): Promise<string> {
  await mkdir(CHANGESET_DIR, { recursive: true })

  const id = randomBytes(8).toString('hex')
  const frontmatter = Object.entries(packages)
    .map(([pkg, bump]) => `"${pkg}": ${bump}`)
    .join('\n')

  const content = `---\n${frontmatter}\n---\n\n${summary}\n`
  const filePath = join(CHANGESET_DIR, `${id}.md`)
  await writeFile(filePath, content, 'utf-8')
  return id
}

export async function consumeChangesets(): Promise<ChangesetFile[]> {
  const changesets = await readChangesets()
  // Delete consumed changeset files
  for (const cs of changesets) {
    try {
      await unlink(join(CHANGESET_DIR, `${cs.id}.md`))
    } catch { /* already deleted */ }
  }
  return changesets
}
