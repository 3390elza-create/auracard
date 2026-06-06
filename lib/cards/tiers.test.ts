import { describe, expect, it } from 'vitest'
import { CARD_TIERS, CARD_TIER_LIST, meetsMinimum, nextFillAction, shortfallUsd } from './tiers'

describe('card tiers', () => {
  it('orders tiers by ascending minimum balance', () => {
    const mins = CARD_TIER_LIST.map((t) => t.minBalanceUsd)
    expect(mins).toEqual([200, 1_000, 10_000])
  })

  it('only the top tier earns monthly yield', () => {
    expect(CARD_TIERS.white.monthlyYield).toBeUndefined()
    expect(CARD_TIERS.blue.monthlyYield).toBeUndefined()
    expect(CARD_TIERS.metal.monthlyYield).toBe('1–2%')
  })
})

describe('shortfallUsd', () => {
  it('reports how much more balance is needed below the minimum', () => {
    expect(shortfallUsd(CARD_TIERS.blue, 600)).toBe(400)
  })

  it('is zero exactly at the minimum', () => {
    expect(shortfallUsd(CARD_TIERS.white, 200)).toBe(0)
  })

  it('is zero (never negative) above the minimum', () => {
    expect(shortfallUsd(CARD_TIERS.white, 5_000)).toBe(0)
  })
})

describe('meetsMinimum', () => {
  it('is false below the minimum', () => {
    expect(meetsMinimum(CARD_TIERS.metal, 9_999)).toBe(false)
  })

  it('is true at or above the minimum', () => {
    expect(meetsMinimum(CARD_TIERS.metal, 10_000)).toBe(true)
    expect(meetsMinimum(CARD_TIERS.white, 250)).toBe(true)
  })
})

describe('nextFillAction', () => {
  it('is eligible exactly at the minimum and above', () => {
    expect(nextFillAction({ depositedUsd: 200, minUsd: 200, hasMovableValue: true })).toBe('eligible')
    expect(nextFillAction({ depositedUsd: 250, minUsd: 200, hasMovableValue: false })).toBe('eligible')
  })

  it('converts when short and the wallet has movable value', () => {
    expect(nextFillAction({ depositedUsd: 120, minUsd: 200, hasMovableValue: true })).toBe('convert')
    expect(nextFillAction({ depositedUsd: 0, minUsd: 200, hasMovableValue: true })).toBe('convert')
  })

  it('asks to add funds when short and nothing movable is left', () => {
    expect(nextFillAction({ depositedUsd: 120, minUsd: 200, hasMovableValue: false })).toBe('add_funds')
    expect(nextFillAction({ depositedUsd: 0, minUsd: 200, hasMovableValue: false })).toBe('add_funds')
  })
})
