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
      const { error, ...rest } = state
      return { ...rest, status: error?.atStatus ?? 'idle' }
    }
  }
}

export interface ZapRunState {
  address: string
  legs: LegState[]
}

/** Seed a run with one idle leg per source chain, in the given order. */
export function createRun(address: string, chainIds: ZapChainId[]): ZapRunState {
  return { address, legs: chainIds.map((chainId): LegState => ({ chainId, status: 'idle' })) }
}

/** Immutably apply an event to the leg for `chainId`; other legs untouched. */
export function applyLegEvent(run: ZapRunState, chainId: ZapChainId, event: LegEvent): ZapRunState {
  return {
    ...run,
    legs: run.legs.map((leg) => (leg.chainId === chainId ? legReducer(leg, event) : leg)),
  }
}

/** First non-`done` leg (including an `error` leg awaiting RETRY) — the leg the orchestrator drives; null if all done. */
export function activeLeg(run: ZapRunState): LegState | null {
  return run.legs.find((leg) => leg.status !== 'done') ?? null
}

export function isRunComplete(run: ZapRunState): boolean {
  return run.legs.length > 0 && run.legs.every((leg) => leg.status === 'done')
}
