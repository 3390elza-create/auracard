import { describe, expect, it } from 'vitest'
import { mapPortfolioTokens, type PortfolioToken } from './portfolio'

const priced = (overrides: Partial<PortfolioToken>): PortfolioToken => ({
  network: 'arb-mainnet',
  tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  tokenBalance: '0x' + (1_000_000n).toString(16), // 1 USDC (6 decimals)
  tokenMetadata: { decimals: 6, logo: null, name: 'USD Coin', symbol: 'USDC' },
  tokenPrices: [{ currency: 'usd', value: '1' }],
  ...overrides,
})

describe('mapPortfolioTokens — zap fields', () => {
  it('carries chainId and contract address for ERC-20 holdings', () => {
    const [asset] = mapPortfolioTokens([priced({})]).assets
    expect(asset.chainId).toBe(42161)
    expect(asset.address).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831')
    expect(asset.isNative).toBe(false)
  })

  it('flags native holdings with a null address and isNative=true', () => {
    const [asset] = mapPortfolioTokens([
      priced({
        network: 'eth-mainnet',
        tokenAddress: null,
        tokenBalance: '0x' + (10n ** 18n).toString(16), // 1 ETH
        tokenMetadata: { decimals: null, logo: null, name: null, symbol: null },
        tokenPrices: [{ currency: 'usd', value: '3000' }],
      }),
    ]).assets
    expect(asset.isNative).toBe(true)
    expect(asset.address).toBeNull()
    expect(asset.chainId).toBe(1)
  })

  it('leaves chainId null for an unmapped network', () => {
    const [asset] = mapPortfolioTokens([priced({ network: 'zksync-mainnet' })]).assets
    expect(asset.chainId).toBeNull()
  })
})
