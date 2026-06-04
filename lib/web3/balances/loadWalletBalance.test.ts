import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseUnits } from 'viem'
import type { Address } from '@/lib/web3/types'

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return { ...actual, createPublicClient: vi.fn(() => ({})), http: vi.fn(() => ({})) }
})
vi.mock('./readBalances', () => ({ readChainBalances: vi.fn() }))
vi.mock('./prices', () => ({ readPrices: vi.fn() }))

import { readChainBalances } from './readBalances'
import { readPrices } from './prices'
import { loadWalletBalance } from './loadWalletBalance'

const ADDRESS = '0x1111111111111111111111111111111111111111' as Address

beforeEach(() => {
  vi.mocked(readPrices).mockResolvedValue({ ETH: 2000, BTC: 60000, USD: 1 })
  vi.mocked(readChainBalances).mockReset()
})

describe('loadWalletBalance', () => {
  it('aggregates balances across chains into a USD total', async () => {
    // First chain returns 1 ETH; all other chains return nothing.
    vi.mocked(readChainBalances)
      .mockResolvedValueOnce([{ canonical: 'ETH', raw: parseUnits('1', 18) }])
      .mockResolvedValue([])

    const balance = await loadWalletBalance(ADDRESS)

    expect(balance.totalUsd).toBe(2000)
    expect(balance.assets[0]).toMatchObject({ symbol: 'ETH', usdValue: 2000 })
  })

  it('degrades a failing chain to an empty contribution', async () => {
    vi.mocked(readChainBalances).mockRejectedValue(new Error('rpc down'))
    const balance = await loadWalletBalance(ADDRESS)
    expect(balance.totalUsd).toBe(0)
    expect(balance.assets).toEqual([])
  })
})
