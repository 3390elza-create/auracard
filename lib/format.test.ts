import { describe, it, expect } from 'vitest'
import { formatUSD } from './format'

describe('formatUSD', () => {
  it('shows cents for sub-dollar values (never collapses to $0)', () => {
    expect(formatUSD(0.19)).toBe('$0.19')
    expect(formatUSD(0.5)).toBe('$0.50')
  })

  it('shows whole dollars for values >= $1', () => {
    expect(formatUSD(1500)).toBe('$1,500')
  })

  it('formats exact zero as $0', () => {
    expect(formatUSD(0)).toBe('$0')
  })
})
