import { describe, it, expect } from 'vitest'
import { generateDemoCard, passesLuhn } from './generateDemoCard'
import type { Address } from '@/lib/web3/types'

const ADDR = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address

describe('generateDemoCard', () => {
  const card = generateDemoCard(ADDR, 2026)

  it('produces a 16-digit, Luhn-valid number', () => {
    const digits = card.number.replace(/\s/g, '')
    expect(digits).toHaveLength(16)
    expect(passesLuhn(digits)).toBe(true)
  })
  it('is a Mastercard number (classic BIN 51–55) to match the card brand', () => {
    const digits = card.number.replace(/\s/g, '')
    expect(digits).toMatch(/^5[1-5]/)
  })
  it('has a valid future expiry', () => {
    expect(card.expiryMonth).toBeGreaterThanOrEqual(1)
    expect(card.expiryMonth).toBeLessThanOrEqual(12)
    expect(card.expiryYear).toBeGreaterThan(2026)
  })
  it('has a 3-digit CVV', () => {
    expect(card.cvv).toMatch(/^\d{3}$/)
  })
  it('is deterministic for the same address', () => {
    expect(generateDemoCard(ADDR, 2026)).toEqual(card)
  })
})
