import { createInterface } from 'readline'
import { spawn } from 'child_process'

export async function confirmRelease(
  bumpType: string,
  nextVersion: string,
  changelogPreview: string
): Promise<'proceed' | 'abort' | 'edit'> {
  console.log(`\nProposed release: ${nextVersion} (${bumpType} bump)`)
  console.log('\n--- Changelog Preview ---')
  console.log(changelogPreview)
  console.log('-------------------------\n')

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question('Proceed? (y/n/edit): ', answer => {
      rl.close()
      const a = answer.trim().toLowerCase()
      if (a === 'y' || a === 'yes') resolve('proceed')
      else if (a === 'edit') resolve('edit')
      else resolve('abort')
    })
  })
}

export async function openInEditor(content: string): Promise<string> {
  const { writeFile, readFile, unlink } = await import('fs/promises')
  const { tmpdir } = await import('os')
  const { join } = await import('path')
  const tmpPath = join(tmpdir(), 'bumpcraft-changelog.md')
  await writeFile(tmpPath, content, 'utf-8')
  const editor = process.env.EDITOR ?? 'notepad'
  await new Promise<void>((resolve, reject) => {
    const child = spawn(editor, [tmpPath], { stdio: 'inherit' })
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Editor exited with ${code}`)))
  })
  try {
    const edited = await readFile(tmpPath, 'utf-8')
    return edited
  } finally {
    await unlink(tmpPath).catch(() => { /* best-effort cleanup */ })
  }
}
