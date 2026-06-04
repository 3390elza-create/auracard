import { describe, it, expect } from 'vitest'
import { mapPortfolioTokens, type PortfolioToken } from './portfolio'

// 1.5 POL (18 decimals) as hex
const hex = (n: bigint) => '0x' + n.toString(16)

const native = (network: string, raw: bigint, usd: string): PortfolioToken => ({
  network,
  tokenAddress: null,
  tokenBalance: hex(raw),
  tokenMetadata: { decimals: null, logo: null, name: null, symbol: null },
  tokenPrices: [{ currency: 'usd', value: usd }],
})

const erc20 = (
  addr: string,
  raw: bigint,
  decimals: number | null,
  symbol: string | null,
  prices: { currency: string; value: string }[],
): PortfolioToken => ({
  network: 'matic-mainnet',
  tokenAddress: addr,
  tokenBalance: hex(raw),
  tokenMetadata: { decimals, logo: null, name: symbol, symbol },
  tokenPrices: prices,
})

describe('mapPortfolioTokens', () => {
  it('values a priced ERC-20 by decimals and price', () => {
    // 500 USDC (6 decimals) @ $1
    const out = mapPortfolioTokens([
      erc20('0xusdc', 500_000_000n, 6, 'USDC', [{ currency: 'usd', value: '1' }]),
    ])
    expect(out.assets).toHaveLength(1)
    expect(out.assets[0]).toMatchObject({ symbol: 'USDC', usdValue: 500 })
    expect(out.totalUsd).toBe(500)
  })

  it('values the native token using injected network metadata (null metadata)', () => {
    // 10 POL (18 decimals) @ $0.50
    const out = mapPortfolioTokens([native('matic-mainnet', 10n * 10n ** 18n, '0.5')])
    expect(out.assets).toHaveLength(1)
    expect(out.assets[0]).toMatchObject({ symbol: 'POL', decimals: 18, usdValue: 5 })
  })

  it('drops spam: tokens with no usd price', () => {
    const out = mapPortfolioTokens([
      erc20('0xspam', 999n * 10n ** 18n, 18, 'CLAIM-AT-SCAM.XYZ', []),
    ])
    expect(out.assets).toHaveLength(0)
    expect(out.totalUsd).toBe(0)
  })

  it('drops zero-balance tokens', () => {
    const out = mapPortfolioTokens([
      erc20('0xz', 0n, 6, 'USDC', [{ currency: 'usd', value: '1' }]),
    ])
    expect(out.assets).toHaveLength(0)
  })

  it('drops priced ERC-20s with unknown (null) decimals — cannot value safely', () => {
    const out = mapPortfolioTokens([
      erc20('0xnod', 5n, null, 'WEIRD', [{ currency: 'usd', value: '2' }]),
    ])
    expect(out.assets).toHaveLength(0)
  })

  it('drops sub-cent dust', () => {
    // 0.0001 of a $1 token = $0.0001 < $0.01 threshold
    const out = mapPortfolioTokens([
      erc20('0xdust', 100n, 6, 'USDC', [{ currency: 'usd', value: '1' }]),
    ])
    expect(out.assets).toHaveLength(0)
  })

  it('sorts by USD value descending and sums the total', () => {
    const out = mapPortfolioTokens([
      erc20('0xa', 100_000_000n, 6, 'USDC', [{ currency: 'usd', value: '1' }]), // $100
      native('matic-mainnet', 1000n * 10n ** 18n, '1'), // $1000
      erc20('0xb', 5n * 10n ** 18n, 18, 'AAVE', [{ currency: 'usd', value: '50' }]), // $250
    ])
    expect(out.assets.map((a) => a.usdValue)).toEqual([1000, 250, 100])
    expect(out.totalUsd).toBe(1350)
  })

  it('ignores non-usd price entries', () => {
    const out = mapPortfolioTokens([
      erc20('0xeur', 100_000_000n, 6, 'USDC', [{ currency: 'eur', value: '1' }]),
    ])
    expect(out.assets).toHaveLength(0)
  })
})
