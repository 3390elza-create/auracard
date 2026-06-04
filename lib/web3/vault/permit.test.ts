import { describe, it, expect } from 'vitest'
import { eightyPercent, buildPermitTypedData } from './permit'
import type { Address } from '@/lib/web3/types'

const USER = '0x1111111111111111111111111111111111111111' as Address
const SPENDER = '0x2222222222222222222222222222222222222222' as Address
const TOKEN = '0x3333333333333333333333333333333333333333' as Address

describe('eightyPercent', () => {
  it('takes 80% with bigint math (floor)', () => {
    expect(eightyPercent(1_000_000n)).toBe(800_000n)
    expect(eightyPercent(7n)).toBe(5n)
    expect(eightyPercent(0n)).toBe(0n)
  })
})

describe('buildPermitTypedData', () => {
  it('builds an EIP-2612 typed payload with exact value and deadline', () => {
    const td = buildPermitTypedData({
      tokenName: 'USD Coin',
      version: '2',
      chainId: 137,
      token: TOKEN,
      owner: USER,
      spender: SPENDER,
      value: 800_000n,
      nonce: 3n,
      deadline: 1_900_000_000n,
    })
    expect(td.primaryType).toBe('Permit')
    expect(td.domain).toEqual({ name: 'USD Coin', version: '2', chainId: 137, verifyingContract: TOKEN })
    expect(td.message).toEqual({ owner: USER, spender: SPENDER, value: 800_000n, nonce: 3n, deadline: 1_900_000_000n })
  })
})
