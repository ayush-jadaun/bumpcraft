import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let dir: string
let originalCwd: string

beforeEach(() => {
  originalCwd = process.cwd()
  dir = mkdtempSync(join(tmpdir(), 'bumpcraft-changeset-'))
  process.chdir(dir)
})

afterEach(() => {
  process.chdir(originalCwd)
  rmSync(dir, { recursive: true, force: true })
})

describe('Changeset files', () => {

  describe('createChangeset', () => {
    it('creates a .changeset directory and markdown file', async () => {
      const { createChangeset } = await import('../../src/core/changeset-files.js')
      const id = await createChangeset({ auth: 'minor', api: 'patch' }, 'Add OAuth and fix timeout')
      expect(id).toBeTruthy()
      expect(existsSync(join(dir, '.changeset', `${id}.md`))).toBe(true)
    })

    it('file contains frontmatter and summary', async () => {
      const { createChangeset } = await import('../../src/core/changeset-files.js')
      const id = await createChangeset({ core: 'major' }, 'Complete rewrite')
      const content = readFileSync(join(dir, '.changeset', `${id}.md`), 'utf-8')
      expect(content).toContain('---')
      expect(content).toContain('"core": major')
      expect(content).toContain('Complete rewrite')
    })

    it('creates unique IDs for each changeset', async () => {
      const { createChangeset } = await import('../../src/core/changeset-files.js')
      const id1 = await createChangeset({ auth: 'minor' }, 'Change 1')
      const id2 = await createChangeset({ auth: 'patch' }, 'Change 2')
      expect(id1).not.toBe(id2)
    })
  })

  describe('readChangesets', () => {
    it('returns empty array when no .changeset directory', async () => {
      const { readChangesets } = await import('../../src/core/changeset-files.js')
      expect(await readChangesets()).toEqual([])
    })

    it('reads all changeset files', async () => {
      mkdirSync(join(dir, '.changeset'), { recursive: true })
      writeFileSync(join(dir, '.changeset', 'abc.md'), '---\n"auth": minor\n---\n\nAdd feature\n')
      writeFileSync(join(dir, '.changeset', 'def.md'), '---\n"api": patch\n---\n\nFix bug\n')

      const { readChangesets } = await import('../../src/core/changeset-files.js')
      const result = await readChangesets()
      expect(result).toHaveLength(2)
      expect(result.find(c => c.id === 'abc')).toBeDefined()
      expect(result.find(c => c.id === 'def')).toBeDefined()
    })

    it('ignores README.md in .changeset directory', async () => {
      mkdirSync(join(dir, '.changeset'), { recursive: true })
      writeFileSync(join(dir, '.changeset', 'README.md'), '# This folder stores changesets')
      writeFileSync(join(dir, '.changeset', 'valid.md'), '---\n"core": minor\n---\n\nChange\n')

      const { readChangesets } = await import('../../src/core/changeset-files.js')
      const result = await readChangesets()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('valid')
    })

    it('skips files that are not valid changeset format', async () => {
      mkdirSync(join(dir, '.changeset'), { recursive: true })
      writeFileSync(join(dir, '.changeset', 'bad.md'), 'just some random text, no frontmatter')
      writeFileSync(join(dir, '.changeset', 'good.md'), '---\n"ui": patch\n---\n\nFix\n')

      const { readChangesets } = await import('../../src/core/changeset-files.js')
      const result = await readChangesets()
      expect(result).toHaveLength(1)
    })

    it('parses multiple packages in one changeset', async () => {
      mkdirSync(join(dir, '.changeset'), { recursive: true })
      writeFileSync(join(dir, '.changeset', 'multi.md'), '---\n"auth": major\n"api": minor\n"ui": patch\n---\n\nBig change\n')

      const { readChangesets } = await import('../../src/core/changeset-files.js')
      const result = await readChangesets()
      expect(result[0].packages).toEqual({ auth: 'major', api: 'minor', ui: 'patch' })
      expect(result[0].summary).toBe('Big change')
    })
  })

  describe('consumeChangesets', () => {
    it('deletes changeset files after consuming', async () => {
      mkdirSync(join(dir, '.changeset'), { recursive: true })
      writeFileSync(join(dir, '.changeset', 'todo.md'), '---\n"auth": minor\n---\n\nDone\n')

      const { consumeChangesets } = await import('../../src/core/changeset-files.js')
      const consumed = await consumeChangesets()
      expect(consumed).toHaveLength(1)
      expect(existsSync(join(dir, '.changeset', 'todo.md'))).toBe(false)
    })

    it('returns empty and does nothing when no changesets', async () => {
      const { consumeChangesets } = await import('../../src/core/changeset-files.js')
      expect(await consumeChangesets()).toEqual([])
    })
  })
})
