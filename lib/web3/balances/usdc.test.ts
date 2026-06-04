import { describe, it, expect } from 'vitest'
import { isUsdcToken } from './usdc'

const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359'

describe('isUsdcToken', () => {
  it('matches the canonical USDC address on a network', () => {
    expect(isUsdcToken('polygon-mainnet', POLYGON_USDC)).toBe(true)
  })

  it('matches case-insensitively (Alchemy may return lowercase)', () => {
    expect(isUsdcToken('polygon-mainnet', POLYGON_USDC.toLowerCase())).toBe(true)
  })

  it('treats Alchemy\'s matic-mainnet alias as Polygon', () => {
    expect(isUsdcToken('matic-mainnet', POLYGON_USDC)).toBe(true)
  })

  it('returns false for the native token (null address)', () => {
    expect(isUsdcToken('polygon-mainnet', null)).toBe(false)
  })

  it('returns false for a non-USDC token', () => {
    expect(isUsdcToken('polygon-mainnet', '0x0000000000000000000000000000000000000001')).toBe(false)
  })

  it('returns false for an unknown network', () => {
    expect(isUsdcToken('solana-mainnet', POLYGON_USDC)).toBe(false)
  })
})
