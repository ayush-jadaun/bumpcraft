import type { Command } from 'commander'
import { loadConfig } from '../../core/config.js'

export function registerPlugins(program: Command) {
  const cmd = program.command('plugins').description('Manage plugins')
  cmd.command('list').description('List installed plugins').action(async () => {
    const config = await loadConfig('.bumpcraftrc.json')
    const plugins = config.plugins.map(p => Array.isArray(p) ? p[0] : p)
    plugins.forEach(p => console.log(` - ${p}`))
  })
}
