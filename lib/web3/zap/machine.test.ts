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
