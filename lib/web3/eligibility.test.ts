import { describe, it, expect } from 'vitest'
import { parseUnits } from 'viem'
import {
  aggregateAssets,
  computeEstimatedLimit,
  formatTokenAmount,
  ELIGIBILITY_LTV,
  type PriceMap,
} from './eligibility'

const PRICES: PriceMap = { ETH: 2000, BTC: 60000, USD: 1 }

describe('aggregateAssets', () => {
  it('sums the same asset across chains and values it in USD', () => {
    const result = aggregateAssets(
      [
        { canonical: 'ETH', raw: parseUnits('1', 18) }, // mainnet native
        { canonical: 'ETH', raw: parseUnits('0.5', 18) }, // arbitrum native
        { canonical: 'ETH', raw: parseUnits('0.5', 18) }, // polygon WETH
        { canonical: 'USDC', raw: parseUnits('1000', 6) },
      ],
      PRICES,
    )

    const eth = result.assets.find(a => a.symbol === 'ETH')!
    expect(eth.amountRaw).toBe(parseUnits('2', 18))
    expect(eth.usdValue).toBe(4000) // 2 ETH * 2000
    expect(eth.amountDisplay).toBe('2')

    const usdc = result.assets.find(a => a.symbol === 'USDC')!
    expect(usdc.usdValue).toBe(1000)

    expect(result.totalUsd).toBe(5000)
  })

  it('drops zero balances and sorts by USD value descending', () => {
    const result = aggregateAssets(
      [
        { canonical: 'USDC', raw: parseUnits('100', 6) },
        { canonical: 'BTC', raw: parseUnits('1', 8) }, // 60000
        { canonical: 'ETH', raw: 0n },
      ],
      PRICES,
    )

    expect(result.assets.map(a => a.symbol)).toEqual(['BTC', 'USDC'])
    expect(result.assets.some(a => a.symbol === 'ETH')).toBe(false)
    expect(result.totalUsd).toBe(60100)
  })

  it('returns an empty, zero-value balance when the wallet holds nothing', () => {
    const result = aggregateAssets([{ canonical: 'ETH', raw: 0n }], PRICES)
    expect(result.assets).toHaveLength(0)
    expect(result.totalUsd).toBe(0)
  })
})

describe('computeEstimatedLimit', () => {
  it('applies a flat 80% LTV', () => {
    expect(ELIGIBILITY_LTV).toBe(0.8)
    const limit = computeEstimatedLimit(10000)
    expect(limit.limitUsd).toBe(8000)
    expect(limit.utilizationPercent).toBe(100)
  })

  it('is zero for an empty wallet', () => {
    expect(computeEstimatedLimit(0).limitUsd).toBe(0)
  })
})

describe('formatTokenAmount', () => {
  it('scales precision by magnitude', () => {
    expect(formatTokenAmount(0)).toBe('0')
    expect(formatTokenAmount(0.1234)).toBe('0.1234')
    expect(formatTokenAmount(12.3456)).toBe('12.35')
    expect(formatTokenAmount(5000)).toBe('5,000')
  })
})
