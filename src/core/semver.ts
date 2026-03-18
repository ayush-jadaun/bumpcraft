import { BumpcraftError, ErrorCode } from './errors.js'

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\w.-]+))?(?:\+([\w.-]+))?$/

export class SemVer {
  private constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly preRelease: string | null = null,
    public readonly buildMetadata: string | null = null
  ) {}

  static parse(version: string): SemVer {
    const match = SEMVER_REGEX.exec(version.trim())
    if (!match) {
      throw new BumpcraftError(
        ErrorCode.INVALID_VERSION,
        `Invalid semver: "${version}"`
      )
    }
    return new SemVer(
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      match[4] ?? null,
      match[5] ?? null
    )
  }

  toString(): string {
    let v = `${this.major}.${this.minor}.${this.patch}`
    if (this.preRelease) v += `-${this.preRelease}`
    if (this.buildMetadata) v += `+${this.buildMetadata}`
    return v
  }

  gt(other: SemVer): boolean { return this._compare(other) > 0 }
  lt(other: SemVer): boolean { return this._compare(other) < 0 }
  eq(other: SemVer): boolean { return this._compare(other) === 0 }
  gte(other: SemVer): boolean { return this._compare(other) >= 0 }
  lte(other: SemVer): boolean { return this._compare(other) <= 0 }

  bumpMajor(): SemVer { return new SemVer(this.major + 1, 0, 0) }
  bumpMinor(): SemVer { return new SemVer(this.major, this.minor + 1, 0) }
  bumpPatch(): SemVer { return new SemVer(this.major, this.minor, this.patch + 1) }

  bumpPreRelease(tag: string): SemVer {
    if (this.preRelease?.startsWith(`${tag}.`)) {
      const counter = parseInt(this.preRelease.split('.').pop() ?? '0', 10)
      return new SemVer(this.major, this.minor, this.patch, `${tag}.${counter + 1}`)
    }
    return new SemVer(this.major, this.minor, this.patch, `${tag}.1`)
  }

  private _compare(other: SemVer): number {
    if (this.major !== other.major) return this.major - other.major
    if (this.minor !== other.minor) return this.minor - other.minor
    if (this.patch !== other.patch) return this.patch - other.patch
    if (this.preRelease && !other.preRelease) return -1
    if (!this.preRelease && other.preRelease) return 1
    if (this.preRelease && other.preRelease) {
      const aParts = this.preRelease.split('.')
      const bParts = other.preRelease.split('.')
      const len = Math.max(aParts.length, bParts.length)
      for (let i = 0; i < len; i++) {
        if (i >= aParts.length) return -1
        if (i >= bParts.length) return 1
        const aNum = /^\d+$/.test(aParts[i]) ? parseInt(aParts[i], 10) : NaN
        const bNum = /^\d+$/.test(bParts[i]) ? parseInt(bParts[i], 10) : NaN
        if (!isNaN(aNum) && !isNaN(bNum)) {
          if (aNum !== bNum) return aNum - bNum
        } else if (!isNaN(aNum)) {
          return -1 // numeric < alphanumeric (semver spec §11.4.1)
        } else if (!isNaN(bNum)) {
          return 1  // alphanumeric > numeric
        } else {
          const cmp = aParts[i].localeCompare(bParts[i])
          if (cmp !== 0) return cmp
        }
      }
    }
    return 0
  }
}
