export enum ErrorCode {
  NO_COMMITS = 'NO_COMMITS',
  INVALID_VERSION = 'INVALID_VERSION',
  PLUGIN_FAILED = 'PLUGIN_FAILED',
  GIT_ERROR = 'GIT_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  POLICY_BLOCKED = 'POLICY_BLOCKED',
}

export class BumpcraftError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'BumpcraftError'
  }
}
