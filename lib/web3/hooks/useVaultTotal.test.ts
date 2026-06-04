import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return { ...actual, createPublicClient: vi.fn(), http: vi.fn(() => ({})) }
})
vi.mock('@/lib/web3/vault/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/web3/vault/config')>()
  return { ...actual, getVaultAddress: vi.fn(() => '0x000000000000000000000000000000000000dEaD') }
})

import { createPublicClient } from 'viem'
import { readVaultTotal } from './useVaultTotal'

beforeEach(() => {
  vi.mocked(createPublicClient).mockReset()
})

describe('readVaultTotal', () => {
  it('reads totalAssets from the vault and returns it as a bigint', async () => {
    const readContract = vi.fn().mockResolvedValue(5_000_000n)
    vi.mocked(createPublicClient).mockReturnValue({ readContract } as never)

    const result = await readVaultTotal()

    expect(result).toEqual({ totalAssets: 5_000_000n })
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'totalAssets' }),
    )
  })
})
