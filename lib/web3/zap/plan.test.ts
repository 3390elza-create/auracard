import { describe, expect, it } from 'vitest'
import type { AssetBalance } from '@/lib/dashboard/types'
import { buildZapPlan, filterLegsByGas } from './plan'
import { DEFAULT_ZAP_CONFIG, NATIVE_SENTINEL } from './types'

// Minimal AssetBalance factory for plan inputs.
function asset(o: Partial<AssetBalance>): AssetBalance {
  return {
    symbol: 'TKN',
    name: 'Token',
    amountRaw: 0n,
    decimals: 18,
    amountDisplay: '0',
    usdValue: 0,
    chainId: 42161,
    address: '0xtoken',
    isNative: false,
    isUsdc: false,
    ...o,
  }
}

describe('buildZapPlan', () => {
  it('skips tokens on unsupported chains', () => {
    const plan = buildZapPlan([asset({ chainId: null, usdValue: 500 })], DEFAULT_ZAP_CONFIG)
    expect(plan.legs).toHaveLength(0)
    expect(plan.skipped).toEqual([
      expect.objectContaining({ reason: 'unsupported_chain' }),
    ])
  })

  it('skips non-native tokens missing a contract address', () => {
    const plan = buildZapPlan(
      [asset({ address: null, isNative: false, usdValue: 500 })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.skipped[0].reason).toBe('missing_address')
  })

  it('skips non-native tokens below the floor', () => {
    const plan = buildZapPlan([asset({ usdValue: 0.5, amountRaw: 1n })], DEFAULT_ZAP_CONFIG)
    expect(plan.skipped[0].reason).toBe('below_floor')
    expect(plan.legs).toHaveLength(0)
  })

  it('includes a non-native token exactly at the floor (inclusive)', () => {
    const plan = buildZapPlan([asset({ usdValue: 1, amountRaw: 1n })], DEFAULT_ZAP_CONFIG)
    expect(plan.skipped).toHaveLength(0)
    expect(plan.legs[0].selections[0].usdValue).toBe(1)
  })

  it('converts the full balance of a non-native token above the floor', () => {
    const plan = buildZapPlan(
      [asset({ chainId: 8453, address: '0xusdc', usdValue: 100, amountRaw: 100_000_000n })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].chainId).toBe(8453)
    expect(plan.legs[0].selections[0].amountRaw).toBe(100_000_000n)
    expect(plan.legs[0].selections[0].usdValue).toBe(100)
  })

  it('reserves native gas value on mainnet and converts the remainder', () => {
    // $40 native on Ethereum (chain 1); mainnet reserve $8 => convert $32.
    const plan = buildZapPlan(
      [asset({ chainId: 1, isNative: true, address: null, decimals: 18, amountRaw: 10n ** 18n, usdValue: 40 })],
      DEFAULT_ZAP_CONFIG,
    )
    const sel = plan.legs[0].selections[0]
    expect(sel.token.address).toBe(NATIVE_SENTINEL)
    // reserveRaw = 1e18 * 8 / 40 = 2e17; convert = 8e17
    expect(sel.amountRaw).toBe(800_000_000_000_000_000n)
    expect(sel.usdValue).toBeCloseTo(32, 6)
  })

  it('skips native when the post-reserve remainder is below the floor', () => {
    // $1.20 native POL on Polygon, reserve $0.50 => $0.70 remainder < $1 floor.
    const plan = buildZapPlan(
      [asset({ chainId: 137, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 1.2 })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.skipped[0].reason).toBe('native_below_reserve')
    expect(plan.legs).toHaveLength(0)
  })

  it('groups selections per chain and orders Polygon first, then by total desc', () => {
    const plan = buildZapPlan(
      [
        asset({ chainId: 1, address: '0xa', usdValue: 1000, amountRaw: 1000n }),
        asset({ chainId: 8453, address: '0xb', usdValue: 50, amountRaw: 50n }),
        asset({ chainId: 137, address: '0xc', usdValue: 10, amountRaw: 10n }),
      ],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs.map((l) => l.chainId)).toEqual([137, 1, 8453])
    expect(plan.totalUsd).toBe(1060)
  })

  it('excludes destination-chain USDC from legs (deposited directly, not swapped)', () => {
    const plan = buildZapPlan(
      [asset({ chainId: 137, address: '0xusdc', isUsdc: true, usdValue: 500, amountRaw: 500_000_000n })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('already_usdc')
  })

  it('still converts a non-USDC holding on the destination chain', () => {
    const plan = buildZapPlan(
      [asset({ chainId: 137, address: '0xpol', isUsdc: false, usdValue: 50, amountRaw: 50n })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].chainId).toBe(137)
    expect(plan.skipped).toHaveLength(0)
  })

  it('includes USDC on a non-destination chain as a leg', () => {
    const plan = buildZapPlan(
      [asset({ chainId: 1, address: '0xusdceth', isUsdc: true, usdValue: 200, amountRaw: 200_000_000n })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].chainId).toBe(1)
    expect(plan.skipped).toHaveLength(0)
  })

  it('reserves more native gas on mainnet than on cheap chains', () => {
    const eth = buildZapPlan(
      [asset({ chainId: 1, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 40 })],
      DEFAULT_ZAP_CONFIG,
    )
    const pol = buildZapPlan(
      [asset({ chainId: 137, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 40 })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(eth.legs[0].selections[0].usdValue).toBeCloseTo(32, 6)   // $40 - $8 mainnet
    expect(pol.legs[0].selections[0].usdValue).toBeCloseTo(39.5, 6) // $40 - $0.50 Polygon
  })
})

describe('filterLegsByGas', () => {
  it('drops an ERC-20-only leg on a chain with no native gas', () => {
    const assets = [asset({ chainId: 1, address: '0xusdceth', isUsdc: true, usdValue: 200, amountRaw: 200_000_000n })]
    const plan = filterLegsByGas(buildZapPlan(assets, DEFAULT_ZAP_CONFIG), assets, DEFAULT_ZAP_CONFIG)
    expect(plan.legs).toHaveLength(0)
    expect(plan.skipped.some((s) => s.reason === 'insufficient_gas')).toBe(true)
  })

  it('keeps the leg when the chain holds enough native for gas', () => {
    // $200 USDC + $2 native ETH on Ethereum: ETH is below the $8 reserve (so it
    // is not itself converted) but $2 ≥ the $1.5 mainnet gas floor.
    const assets = [
      asset({ chainId: 1, address: '0xusdceth', isUsdc: true, usdValue: 200, amountRaw: 200_000_000n }),
      asset({ chainId: 1, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 2 }),
    ]
    const plan = filterLegsByGas(buildZapPlan(assets, DEFAULT_ZAP_CONFIG), assets, DEFAULT_ZAP_CONFIG)
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].chainId).toBe(1)
    expect(plan.skipped.some((s) => s.reason === 'insufficient_gas')).toBe(false)
  })

  it('leaves a leg that converts native (gas covered by the reserve)', () => {
    const assets = [asset({ chainId: 1, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 40 })]
    const plan = filterLegsByGas(buildZapPlan(assets, DEFAULT_ZAP_CONFIG), assets, DEFAULT_ZAP_CONFIG)
    expect(plan.legs).toHaveLength(1)
    expect(plan.skipped.some((s) => s.reason === 'insufficient_gas')).toBe(false)
  })

  it('preserves existing skipped entries', () => {
    const assets = [
      asset({ chainId: null, usdValue: 500 }), // unsupported_chain
      asset({ chainId: 1, address: '0xusdceth', isUsdc: true, usdValue: 200, amountRaw: 200_000_000n }), // no gas
    ]
    const plan = filterLegsByGas(buildZapPlan(assets, DEFAULT_ZAP_CONFIG), assets, DEFAULT_ZAP_CONFIG)
    expect(plan.skipped.some((s) => s.reason === 'unsupported_chain')).toBe(true)
    expect(plan.skipped.some((s) => s.reason === 'insufficient_gas')).toBe(true)
  })
})
