import type { Command } from 'commander'
import { loadConfig } from '../../core/config.js'
import { execSync } from 'child_process'
import { readFile } from 'fs/promises'
import { join } from 'path'

export function registerPublish(program: Command) {
  program
    .command('publish')
    .description('Publish packages to npm')
    .option('--package <name>', 'Publish a specific monorepo package')
    .option('--provenance', 'Generate npm provenance attestation (CI only)')
    .option('--tag <tag>', 'npm dist-tag (e.g. latest, next, beta)')
    .option('--dry-run', 'Preview without publishing')
    .option('--otp <code>', 'One-time password for npm 2FA')
    .action(async (opts) => {
      try {
        const config = await loadConfig('.bumpcraftrc.json')

        // Collect packages to publish
        const targets: { name: string; path: string }[] = []

        if (config.monorepo) {
          const entries = opts.package
            ? [[opts.package, config.monorepo[opts.package]]]
            : Object.entries(config.monorepo)

          if (opts.package && !config.monorepo[opts.package]) {
            console.error(`Package "${opts.package}" not found in monorepo config`)
            process.exit(1)
          }

          for (const [name, pkgConfig] of entries) {
            if (!pkgConfig) continue
            const pc = pkgConfig as { path: string }

            // Skip private packages
            try {
              const content = await readFile(join(pc.path, 'package.json'), 'utf-8')
              const pkg = JSON.parse(content)
              if (pkg.private) {
                console.log(`${name}: private — skipping`)
                continue
              }
              targets.push({ name, path: pc.path })
            } catch {
              console.error(`${name}: cannot read package.json at ${pc.path}`)
            }
          }
        } else {
          // Single package
          try {
            const content = await readFile('package.json', 'utf-8')
            const pkg = JSON.parse(content)
            if (pkg.private) {
              console.error('Package is private — cannot publish. Remove "private": true from package.json.')
              process.exit(1)
            }
            targets.push({ name: pkg.name, path: '.' })
          } catch {
            console.error('Cannot read package.json')
            process.exit(1)
          }
        }

        if (!targets.length) {
          console.log('No publishable packages found.')
          return
        }

        for (const target of targets) {
          const args = ['npm', 'publish']
          // Scoped packages (@org/name) default to private on npm — auto-add --access public
          if (target.name.startsWith('@')) args.push('--access', 'public')
          if (opts.provenance) args.push('--provenance')
          if (opts.tag) args.push('--tag', opts.tag)
          if (opts.dryRun) args.push('--dry-run')
          if (opts.otp) args.push('--otp', opts.otp)

          const cmd = args.join(' ')
          console.log(`Publishing ${target.name} from ${target.path}...`)

          try {
            execSync(cmd, { cwd: target.path, stdio: 'inherit' })
            console.log(`${target.name}: published`)
          } catch {
            console.error(`${target.name}: publish failed`)
            process.exit(1)
          }
        }
      } catch (e) {
        console.error(`Error: ${(e as Error).message}`)
        process.exit(1)
      }
    })
}
