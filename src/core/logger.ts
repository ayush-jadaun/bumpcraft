export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug(msg: string, ...args: unknown[]): void
  info(msg: string, ...args: unknown[]): void
  warn(msg: string, ...args: unknown[]): void
  error(msg: string, ...args: unknown[]): void
}

export class ConsoleLogger implements Logger {
  constructor(private readonly verbose = false) {}

  debug(msg: string, ...args: unknown[]) {
    if (this.verbose) console.debug(`[debug] ${msg}`, ...args)
  }
  info(msg: string, ...args: unknown[]) {
    console.info(`[info]  ${msg}`, ...args)
  }
  warn(msg: string, ...args: unknown[]) {
    console.warn(`[warn]  ${msg}`, ...args)
  }
  error(msg: string, ...args: unknown[]) {
    console.error(`[error] ${msg}`, ...args)
  }
}

export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
