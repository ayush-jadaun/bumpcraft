import type { BumpType } from '../pipeline/types.js'

interface PolicyConfig {
  requireApproval: string[]
  autoRelease: string[]
  freezeAfter: string | null
  maxBumpPerDay: number | null
  freezeTestDate?: Date
}

interface PolicyResult {
  allowed: boolean
  reason: string | null
}

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

export class PolicyEngine {
  constructor(private readonly config: PolicyConfig) {}

  check(bumpType: BumpType): PolicyResult {
    if (this.config.requireApproval.includes(bumpType)) {
      return { allowed: false, reason: `${bumpType} bump requires approval. Run with --approve to override.` }
    }

    if (this.config.freezeAfter) {
      const [dayStr, timeStr] = this.config.freezeAfter.split(' ')
      const [freezeHour, freezeMin] = (timeStr ?? '17:00').split(':').map(Number)
      const now = this.config.freezeTestDate ?? new Date()
      const dayIndex = DAY_NAMES.indexOf(dayStr.toLowerCase())
      if (dayIndex !== -1 && now.getDay() === dayIndex) {
        const currentMins = now.getHours() * 60 + now.getMinutes()
        const freezeMins = freezeHour * 60 + freezeMin
        if (currentMins >= freezeMins) {
          return { allowed: false, reason: `Release freeze is active (${this.config.freezeAfter})` }
        }
      }
    }

    return { allowed: true, reason: null }
  }
}
