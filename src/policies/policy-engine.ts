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
  requiresConfirmation: boolean
}

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

export class PolicyEngine {
  constructor(private readonly config: PolicyConfig) {}

  check(bumpType: BumpType, todayReleaseCount = 0): PolicyResult {
    if (this.config.requireApproval.includes(bumpType)) {
      return { allowed: false, reason: `${bumpType} bump requires approval. Run with --approve to override.`, requiresConfirmation: false }
    }

    if (this.config.maxBumpPerDay !== null && todayReleaseCount >= this.config.maxBumpPerDay) {
      return { allowed: false, reason: `Max releases per day (${this.config.maxBumpPerDay}) reached`, requiresConfirmation: false }
    }

    if (this.config.freezeAfter) {
      const [dayStr, timeStr] = this.config.freezeAfter.split(' ')
      const [freezeHour, freezeMin] = (timeStr ?? '17:00').split(':').map(Number)
      const now = this.config.freezeTestDate ?? new Date()
      const dayIndex = DAY_NAMES.indexOf(dayStr.toLowerCase())
      if (dayIndex !== -1) {
        const daysAfterFreeze = (now.getDay() - dayIndex + 7) % 7
        if (daysAfterFreeze > 0 && daysAfterFreeze <= 2) {
          // 1–2 days after freeze day (e.g. Saturday/Sunday after Friday)
          return { allowed: false, reason: `Release freeze is active (${this.config.freezeAfter})`, requiresConfirmation: false }
        }
        if (daysAfterFreeze === 0) {
          const currentMins = now.getHours() * 60 + now.getMinutes()
          const freezeMins = freezeHour * 60 + freezeMin
          if (currentMins >= freezeMins) {
            return { allowed: false, reason: `Release freeze is active (${this.config.freezeAfter})`, requiresConfirmation: false }
          }
        }
      }
    }

    const requiresConfirmation = !this.config.autoRelease.includes(bumpType)
    return { allowed: true, reason: null, requiresConfirmation }
  }
}
