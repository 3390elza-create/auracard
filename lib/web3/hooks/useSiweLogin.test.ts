import { describe, it, expect, vi } from 'vitest'
import { waitForConnection, type ConnectionWatcher } from './useSiweLogin'
import type { Address } from '@/lib/web3/types'

const USER = '0x1111111111111111111111111111111111111111' as Address

function makeWatcher(overrides: Partial<ConnectionWatcher> = {}): ConnectionWatcher {
  return {
    getAccount: () => null,
    subscribeModalOpen: () => () => {},
    now: () => 0,
    schedule: (fn) => fn(), // run pending ticks synchronously
    timeoutMs: 60_000,
    graceMs: 1_500,
    ...overrides,
  }
}

describe('waitForConnection', () => {
  it('resolves with the account once the wallet connects', async () => {
    const watcher = makeWatcher({
      getAccount: () => ({ address: USER, chainId: 1 }),
    })
    const result = await waitForConnection(watcher)
    expect(result).toEqual({ address: USER, chainId: 1 })
  })

  it('aborts early (cancelled) when the user closes the AppKit modal before connecting', async () => {
    let emit: (open: boolean) => void = () => {}
    const t = { value: 0 }
    const watcher = makeWatcher({
      getAccount: () => null, // never connects
      subscribeModalOpen: (cb) => {
        emit = cb
        return () => {}
      },
      now: () => t.value,
      // advance the clock past the grace window on each scheduled tick
      schedule: (fn) => {
        t.value += 200
        fn()
      },
    })

    const promise = waitForConnection(watcher)
    emit(true) // AppKit modal opens
    emit(false) // user dismisses it without connecting

    const result = await promise
    expect(result).toBeNull() // cancelled — NOT a 60s hang
  })

  it('still resolves if the account settles within the grace window after modal close', async () => {
    let emit: (open: boolean) => void = () => {}
    const t = { value: 0 }
    let connected = false
    const watcher = makeWatcher({
      getAccount: () => (connected ? { address: USER, chainId: 137 } : null),
      subscribeModalOpen: (cb) => {
        emit = cb
        return () => {}
      },
      now: () => t.value,
      schedule: (fn) => {
        t.value += 200
        connected = true // wagmi reports connected on the next tick after close
        fn()
      },
    })

    const promise = waitForConnection(watcher)
    emit(true)
    emit(false)

    const result = await promise
    expect(result).toEqual({ address: USER, chainId: 137 })
  })

  it('unsubscribes from modal state when it resolves', async () => {
    const unsub = vi.fn()
    const watcher = makeWatcher({
      getAccount: () => ({ address: USER, chainId: 1 }),
      subscribeModalOpen: () => unsub,
    })
    await waitForConnection(watcher)
    expect(unsub).toHaveBeenCalledOnce()
  })
})
