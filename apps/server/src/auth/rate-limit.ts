const WINDOW_MS = 15 * 60_000
export const MAX_FAILURES = 5

/** In-memory login throttle: 5 failures per 15 minutes per key. */
export class LoginLimiter {
  private failures = new Map<string, number[]>()

  private recent(key: string, now: number): number[] {
    const list = (this.failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
    this.failures.set(key, list)
    return list
  }

  isBlocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= MAX_FAILURES
  }

  recordFailure(key: string, now = Date.now()): void {
    this.recent(key, now).push(now)
  }

  reset(key: string): void {
    this.failures.delete(key)
  }
}
