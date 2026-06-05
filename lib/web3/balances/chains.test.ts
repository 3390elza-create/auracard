import { describe, expect, it } from 'vitest'
import { chainIdForNetwork } from './chains'

describe('chainIdForNetwork', () => {
  it('maps the supported Alchemy network ids to EVM chain ids', () => {
    expect(chainIdForNetwork('eth-mainnet')).toBe(1)
    expect(chainIdForNetwork('opt-mainnet')).toBe(10)
    expect(chainIdForNetwork('polygon-mainnet')).toBe(137)
    expect(chainIdForNetwork('base-mainnet')).toBe(8453)
    expect(chainIdForNetwork('arb-mainnet')).toBe(42161)
  })

  it("treats Alchemy's matic-mainnet alias as Polygon", () => {
    expect(chainIdForNetwork('matic-mainnet')).toBe(137)
  })

  it('returns null for unknown or missing networks', () => {
    expect(chainIdForNetwork('solana-mainnet')).toBeNull()
    expect(chainIdForNetwork(undefined)).toBeNull()
  })
})
