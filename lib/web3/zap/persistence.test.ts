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
