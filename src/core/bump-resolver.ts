import type { ParsedCommit, BumpType } from '../pipeline/types.js'

const PRIORITY: Record<BumpType, number> = {
  none: 0,
  patch: 1,
  minor: 2,
  major: 3
}

export function resolveBump(
  commits: ParsedCommit[],
  commitTypes: Record<string, string>
): BumpType {
  let highest: BumpType = 'none'

  for (const commit of commits) {
    if (commit.breaking) return 'major'
    const raw = commitTypes[commit.type]
    const bump: BumpType = (raw === 'major' || raw === 'minor' || raw === 'patch' || raw === 'none') ? raw : 'none'
    if (PRIORITY[bump] > PRIORITY[highest]) highest = bump
  }

  return highest
}
