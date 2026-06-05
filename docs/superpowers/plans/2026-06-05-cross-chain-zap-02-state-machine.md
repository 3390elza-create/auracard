# Cross-Chain USDC Zap — Plan 2 of 4: State Machine + Persistence

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A pure, resumable per-leg state machine for the async cross-chain deposit, plus SSR-safe localStorage persistence so a run survives a page refresh.

**Architecture:** Each source chain is one "leg" progressing `idle → quoting → awaiting_approval → swapping → bridging → arriving → depositing → done` (legs may skip `bridging`/`arriving` when the swap lands on Polygon). A pure `legReducer(state, event)` applies forward transitions, records tx hashes, and supports `FAIL`/`RETRY` (retry resumes at the failed step). A `ZapRunState` holds all legs; `persistence.ts` serializes it to `localStorage` keyed by address. No SDK, no React, no transactions — pure logic + storage.

**Tech Stack:** TypeScript (strict), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-05-cross-chain-usdc-zap-deposit-design.md` ("The cross-chain deposit state machine").

**Depends on:** Plan 1 (`lib/web3/zap/types.ts` → `ZapChainId`).

**Security note:** pure data + storage only. No approvals/transactions in this plan.

---

## File Structure
- Create: `lib/web3/zap/machine.ts` — leg statuses, events, `legReducer`, run helpers.
- Create: `lib/web3/zap/machine.test.ts`.
- Create: `lib/web3/zap/persistence.ts` — save/load/clear run, SSR-safe.
- Create: `lib/web3/zap/persistence.test.ts`.

All `LegState` fields are JSON-safe strings (tx hashes) — no `bigint` — so the run serializes cleanly. Deposit amounts are deliberately NOT stored: on resume the orchestrator (Plan 4) reads the actual arrived USDC, per the spec's idempotency rule.

---

### Task 1: Pure leg state machine + run helpers

**Files:**
- Create: `lib/web3/zap/machine.ts`
- Test: `lib/web3/zap/machine.test.ts`

- [ ] **Step 1: Write the failing tests** — Create `lib/web3/zap/machine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  activeLeg,
  applyLegEvent,
  createRun,
  isRunComplete,
  legReducer,
  type LegState,
  type ZapRunState,
} from './machine'

const leg = (o: Partial<LegState> = {}): LegState => ({ chainId: 1, status: 'idle', ...o })

describe('legReducer', () => {
  it('advances along a legal forward transition', () => {
    expect(legReducer(leg({ status: 'idle' }), { type: 'ADVANCE', to: 'quoting' }).status).toBe('quoting')
  })

  it('merges progress data on advance', () => {
    const next = legReducer(leg({ status: 'awaiting_approval' }), {
      type: 'ADVANCE',
      to: 'swapping',
      data: { swapTxHash: '0xabc' },
    })
    expect(next.status).toBe('swapping')
    expect(next.swapTxHash).toBe('0xabc')
  })

  it('treats re-advancing to the same status as an idempotent data merge', () => {
    const next = legReducer(leg({ status: 'bridging' }), {
      type: 'ADVANCE',
      to: 'bridging',
      data: { bridgeMessageHash: '0xmsg' },
    })
    expect(next.status).toBe('bridging')
    expect(next.bridgeMessageHash).toBe('0xmsg')
  })

  it('throws on an illegal transition', () => {
    expect(() => legReducer(leg({ status: 'idle' }), { type: 'ADVANCE', to: 'done' })).toThrow(/illegal/)
  })

  it('FAIL records the status it failed at', () => {
    const next = legReducer(leg({ status: 'swapping' }), { type: 'FAIL', reason: 'rejected' })
    expect(next.status).toBe('error')
    expect(next.error).toEqual({ reason: 'rejected', atStatus: 'swapping' })
  })

  it('RETRY resumes at the failed status and clears the error', () => {
    const errored = legReducer(leg({ status: 'bridging' }), { type: 'FAIL', reason: 'timeout' })
    const retried = legReducer(errored, { type: 'RETRY' })
    expect(retried.status).toBe('bridging')
    expect(retried.error).toBeUndefined()
  })

  it('keeps the original failure point if FAIL fires twice', () => {
    const once = legReducer(leg({ status: 'depositing' }), { type: 'FAIL', reason: 'a' })
    const twice = legReducer(once, { type: 'FAIL', reason: 'b' })
    expect(twice.error?.atStatus).toBe('depositing')
  })
})

describe('run helpers', () => {
  it('createRun seeds one idle leg per chain, preserving order', () => {
    const run = createRun('0xUSER', [137, 42161])
    expect(run.legs.map((l) => [l.chainId, l.status])).toEqual([
      [137, 'idle'],
      [42161, 'idle'],
    ])
  })

  it('applyLegEvent only touches the matching leg', () => {
    const run = createRun('0xUSER', [137, 42161])
    const next = applyLegEvent(run, 42161, { type: 'ADVANCE', to: 'quoting' })
    expect(next.legs.find((l) => l.chainId === 137)!.status).toBe('idle')
    expect(next.legs.find((l) => l.chainId === 42161)!.status).toBe('quoting')
  })

  it('activeLeg returns the first non-done leg, null when all done', () => {
    const run: ZapRunState = {
      address: '0xU',
      legs: [leg({ chainId: 137, status: 'done' }), leg({ chainId: 42161, status: 'bridging' })],
    }
    expect(activeLeg(run)!.chainId).toBe(42161)
    expect(activeLeg({ address: '0xU', legs: [leg({ status: 'done' })] })).toBeNull()
  })

  it('isRunComplete only when every leg is done', () => {
    expect(
      isRunComplete({ address: '0xU', legs: [leg({ status: 'done' }), leg({ status: 'depositing' })] }),
    ).toBe(false)
    expect(isRunComplete({ address: '0xU', legs: [leg({ status: 'done' })] })).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run lib/web3/zap/machine.test.ts` → FAIL (Cannot find module './machine').

- [ ] **Step 3: Implement** — Create `lib/web3/zap/machine.ts`:

```ts
import type { ZapChainId } from './types'

// Per-leg lifecycle. Cross-chain legs traverse swapping->bridging->arriving->
// depositing; a Polygon-local leg may skip bridging/arriving (the swap lands on
// Polygon, or the holding is already USDC and goes straight to depositing).
export type LegStatus =
  | 'idle'
  | 'quoting'
  | 'awaiting_approval'
  | 'swapping'
  | 'bridging'
  | 'arriving'
  | 'depositing'
  | 'done'
  | 'error'

// Tx hashes / bridge message recorded as a leg progresses. All JSON-safe strings
// so a run serializes cleanly and resume never double-submits.
export interface LegProgress {
  approvalTxHash?: string
  swapTxHash?: string
  bridgeTxHash?: string
  bridgeMessageHash?: string
  destTxHash?: string
}

export interface LegState extends LegProgress {
  chainId: ZapChainId
  status: LegStatus
  error?: { reason: string; atStatus: LegStatus }
}

export type LegEvent =
  | { type: 'ADVANCE'; to: LegStatus; data?: LegProgress }
  | { type: 'FAIL'; reason: string }
  | { type: 'RETRY' }

// Allowed forward transitions. Branch points let a leg skip the bridge when the
// USDC ends up on Polygon directly.
const FORWARD: Record<LegStatus, LegStatus[]> = {
  idle: ['quoting'],
  quoting: ['awaiting_approval', 'depositing'],
  awaiting_approval: ['swapping', 'depositing'],
  swapping: ['bridging', 'depositing'],
  bridging: ['arriving'],
  arriving: ['depositing'],
  depositing: ['done'],
  done: [],
  error: [],
}

/** Pure transition for a single leg. Forward moves only; FAIL/RETRY for recovery. */
export function legReducer(state: LegState, event: LegEvent): LegState {
  switch (event.type) {
    case 'ADVANCE': {
      if (event.to === state.status) {
        return { ...state, ...(event.data ?? {}) } // idempotent data merge (safe on resume)
      }
      if (!FORWARD[state.status].includes(event.to)) {
        throw new Error(`illegal leg transition: ${state.status} -> ${event.to}`)
      }
      return { ...state, ...(event.data ?? {}), status: event.to }
    }
    case 'FAIL': {
      if (state.status === 'done') return state
      const atStatus = state.status === 'error' ? (state.error?.atStatus ?? 'idle') : state.status
      return { ...state, status: 'error', error: { reason: event.reason, atStatus } }
    }
    case 'RETRY': {
      if (state.status !== 'error') return state
      const atStatus = state.error?.atStatus ?? 'idle'
      const next: LegState = { ...state, status: atStatus }
      delete next.error
      return next
    }
  }
}

export interface ZapRunState {
  address: string
  legs: LegState[]
}

/** Seed a run with one idle leg per source chain, in the given order. */
export function createRun(address: string, chainIds: ZapChainId[]): ZapRunState {
  return { address, legs: chainIds.map((chainId) => ({ chainId, status: 'idle' as LegStatus })) }
}

/** Immutably apply an event to the leg for `chainId`; other legs untouched. */
export function applyLegEvent(run: ZapRunState, chainId: ZapChainId, event: LegEvent): ZapRunState {
  return {
    ...run,
    legs: run.legs.map((leg) => (leg.chainId === chainId ? legReducer(leg, event) : leg)),
  }
}

/** The first leg not yet `done` (the one the orchestrator should drive); null if all done. */
export function activeLeg(run: ZapRunState): LegState | null {
  return run.legs.find((leg) => leg.status !== 'done') ?? null
}

export function isRunComplete(run: ZapRunState): boolean {
  return run.legs.length > 0 && run.legs.every((leg) => leg.status === 'done')
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run lib/web3/zap/machine.test.ts` → PASS (12 tests).

- [ ] **Step 5: Type-check & commit**

Run: `npm run typecheck` → clean.

```bash
git add lib/web3/zap/machine.ts lib/web3/zap/machine.test.ts
git commit -m "feat(zap): pure resumable per-leg state machine"
```

---

### Task 2: SSR-safe run persistence

**Files:**
- Create: `lib/web3/zap/persistence.ts`
- Test: `lib/web3/zap/persistence.test.ts`

- [ ] **Step 1: Write the failing tests** — Create `lib/web3/zap/persistence.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRun, loadRun, saveRun } from './persistence'
import type { ZapRunState } from './machine'

const run: ZapRunState = {
  address: '0xAbCdEf0000000000000000000000000000000001',
  legs: [{ chainId: 137, status: 'depositing', swapTxHash: '0x1' }],
}

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => map.clear(),
  }
}

function setItemDirect(key: string, value: string) {
  ;(globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage.setItem(key, value)
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryStorage() })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('zap run persistence', () => {
  it('round-trips a run, keyed case-insensitively by address', () => {
    saveRun(run)
    expect(loadRun(run.address.toUpperCase())).toEqual(run)
  })

  it('returns null when nothing is stored', () => {
    expect(loadRun('0xNope')).toBeNull()
  })

  it('returns null for corrupt JSON', () => {
    setItemDirect('aura.zapRun.0xbad', '{not json')
    expect(loadRun('0xbad')).toBeNull()
  })

  it('returns null for a structurally invalid run', () => {
    setItemDirect('aura.zapRun.0xbad', JSON.stringify({ address: '0xbad' }))
    expect(loadRun('0xbad')).toBeNull()
  })

  it('clears a stored run', () => {
    saveRun(run)
    clearRun(run.address)
    expect(loadRun(run.address)).toBeNull()
  })

  it('is a no-op without a window (SSR)', () => {
    vi.stubGlobal('window', undefined)
    expect(() => saveRun(run)).not.toThrow()
    expect(loadRun(run.address)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run lib/web3/zap/persistence.test.ts` → FAIL (Cannot find module './persistence').

- [ ] **Step 3: Implement** — Create `lib/web3/zap/persistence.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run lib/web3/zap/persistence.test.ts` → PASS (6 tests). If the project's Vitest `environment` is `node` and `window` is otherwise undefined, the `vi.stubGlobal('window', ...)` in the test fully supplies it, so the tests work regardless of environment.

- [ ] **Step 5: Type-check & commit**

Run: `npm run typecheck` → clean.

```bash
git add lib/web3/zap/persistence.ts lib/web3/zap/persistence.test.ts
git commit -m "feat(zap): SSR-safe localStorage persistence for resumable runs"
```

---

## Self-Review

**Spec coverage:** "resumable machine" → `legReducer` + `FAIL`/`RETRY` resuming at `atStatus` (Task 1). "per-leg states idle→…→done" → `LegStatus` + `FORWARD` table. "records tx hashes + CCTP message so re-entry never double-submits" → `LegProgress` fields merged on `ADVANCE` (idempotent same-status merge). "restore in-flight run on modal open" → `loadRun` (Task 2). "deposit reads actual arrived USDC (amounts not remembered)" → `LegState` stores no amounts. ✓

**Placeholder scan:** none — complete code + exact commands throughout.

**Type consistency:** `LegStatus`, `LegProgress`, `LegState`, `LegEvent`, `ZapRunState`, and the helpers (`legReducer`, `createRun`, `applyLegEvent`, `activeLeg`, `isRunComplete`) are used identically in `machine.ts`, `machine.test.ts`, `persistence.ts`, and `persistence.test.ts`. `ZapChainId` imported from Plan 1's `types.ts`. The `'idle' as LegStatus` cast in `createRun` keeps the array element type correct under strict TS. ✓

---

## Next: Plan 3 — LI.FI adapter (`lifi.ts`): quote each selection → USDC on Polygon; bounded approval via `setTokenAllowance({ infiniteApproval: false })` + exact pre-approval so `executeRoute` skips its own infinite approval; map LI.FI route/step status → `LegEvent`s; mocked-SDK tests asserting approval is never `MaxUint256`.
