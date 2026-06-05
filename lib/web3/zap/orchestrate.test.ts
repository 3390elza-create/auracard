import { describe, expect, it, vi } from 'vitest'
import { FakeZapProvider } from './fakeProvider'
import { mapProgressToEvent, runZap } from './orchestrate'
import type { ZapPlan } from './types'
import type { LegEvent } from './machine'

const plan: ZapPlan = {
  totalUsd: 100,
  skipped: [],
  legs: [
    {
      chainId: 42161,
      totalUsd: 100,
      selections: [
        {
          token: {
            chainId: 42161, address: '0xToken', symbol: 'USDC', decimals: 6,
            amountRaw: 100_000_000n, usdValue: 100, isUsdc: true, isNative: false,
          },
          amountRaw: 100_000_000n,
          usdValue: 100,
        },
      ],
    },
  ],
}

describe('mapProgressToEvent', () => {
  it('ignores approval progress (handled explicitly before execute)', () => {
    expect(mapProgressToEvent({ kind: 'approval', status: 'done' })).toBeNull()
  })
  it('advances swap/bridge/receive forward', () => {
    expect(mapProgressToEvent({ kind: 'swap', status: 'pending' })).toEqual({ type: 'ADVANCE', to: 'swapping' })
    expect(mapProgressToEvent({ kind: 'bridge', status: 'pending', txHash: '0xb' })).toEqual({
      type: 'ADVANCE', to: 'bridging', data: { bridgeTxHash: '0xb' },
    })
    expect(mapProgressToEvent({ kind: 'receive', status: 'done' })).toEqual({ type: 'ADVANCE', to: 'arriving' })
  })
  it('maps any failed progress to FAIL', () => {
    expect(mapProgressToEvent({ kind: 'bridge', status: 'failed' })).toEqual({ type: 'FAIL', reason: 'bridge_failed' })
  })
})

// Collapse consecutive duplicate ADVANCE targets (idempotent same-status merges).
function advanceTargets(events: Array<[number, LegEvent]>): string[] {
  return events
    .filter((e) => e[1].type === 'ADVANCE')
    .map((e) => (e[1] as { to: string }).to)
    .filter((to, i, arr) => to !== arr[i - 1])
}

describe('runZap', () => {
  it('drives a leg through quote→approve→swap→bridge→arrive, then deposits once', async () => {
    const provider = new FakeZapProvider({
      approvalTxHash: '0xapprove',
      progress: [
        { kind: 'swap', status: 'done', txHash: '0xswap' },
        { kind: 'bridge', status: 'done', txHash: '0xbridge' },
        { kind: 'receive', status: 'done', txHash: '0xrecv' },
      ],
      destTxHash: '0xrecv',
    })
    const events: Array<[number, LegEvent]> = []
    const deposit = vi.fn(async () => ({ status: 'active' as const }))
    const result = await runZap(plan, {
      provider,
      fromAddress: '0xUSER',
      dispatch: (chainId, event) => events.push([chainId, event]),
      deposit,
    })

    expect(advanceTargets(events)).toEqual([
      'quoting', 'awaiting_approval', 'swapping', 'bridging', 'arriving', 'depositing', 'done',
    ])
    expect(deposit).toHaveBeenCalledOnce()
    expect(result.status).toBe('active')
  })

  it('emits FAIL and stops (no deposit) when a leg execute rejects', async () => {
    const provider = new FakeZapProvider({ failExecute: 'swap reverted' })
    const events: Array<[number, LegEvent]> = []
    const deposit = vi.fn(async () => ({ status: 'active' as const }))
    const result = await runZap(plan, {
      provider, fromAddress: '0xUSER',
      dispatch: (c, e) => events.push([c, e]), deposit,
    })
    expect(events.some(([, e]) => e.type === 'FAIL')).toBe(true)
    expect(deposit).not.toHaveBeenCalled()
    expect(result.status).toBe('error')
  })
})
