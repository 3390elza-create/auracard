import type { ZapRunState } from './machine'

const KEY_PREFIX = 'aura.zapRun.'

function storageKey(address: string): string {
  return KEY_PREFIX + address.toLowerCase()
}

function isValidRun(value: unknown): value is ZapRunState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.address !== 'string' || !Array.isArray(v.legs)) return false
  return v.legs.every((l) => {
    if (!l || typeof l !== 'object') return false
    const leg = l as Record<string, unknown>
    return typeof leg.chainId === 'number' && typeof leg.status === 'string'
  })
}

/** Persist an in-flight zap run so it survives a refresh. SSR-safe; failures swallowed. */
export function saveRun(run: ZapRunState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(run.address), JSON.stringify(run))
  } catch {
    // storage unavailable (private mode / quota) — the run just won't persist
  }
}

/** Restore a persisted run for an address, or null if absent/corrupt. */
export function loadRun(address: string): ZapRunState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(address))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidRun(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Remove a persisted run (call after the run completes or is abandoned). */
export function clearRun(address: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(address))
  } catch {
    // ignore
  }
}
