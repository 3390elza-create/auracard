import { describe, expect, it } from 'vitest'
import { normalizeLifiProcess } from './lifiStatus'

describe('normalizeLifiProcess', () => {
  it('maps LI.FI process types to zap step kinds', () => {
    expect(normalizeLifiProcess('TOKEN_ALLOWANCE', 'STARTED')?.kind).toBe('approval')
    expect(normalizeLifiProcess('SWAP', 'PENDING')?.kind).toBe('swap')
    expect(normalizeLifiProcess('CROSS_CHAIN', 'PENDING')?.kind).toBe('bridge')
    expect(normalizeLifiProcess('RECEIVING_CHAIN', 'DONE')?.kind).toBe('receive')
  })

  it('maps LI.FI statuses to zap step statuses', () => {
    expect(normalizeLifiProcess('SWAP', 'STARTED')?.status).toBe('started')
    expect(normalizeLifiProcess('SWAP', 'ACTION_REQUIRED')?.status).toBe('started')
    expect(normalizeLifiProcess('SWAP', 'PENDING')?.status).toBe('pending')
    expect(normalizeLifiProcess('SWAP', 'DONE')?.status).toBe('done')
    expect(normalizeLifiProcess('SWAP', 'FAILED')?.status).toBe('failed')
    expect(normalizeLifiProcess('CROSS_CHAIN', 'CANCELLED')?.status).toBe('failed')
  })

  it('carries the tx hash when present', () => {
    expect(normalizeLifiProcess('SWAP', 'DONE', '0xfeed')?.txHash).toBe('0xfeed')
  })

  it('returns null for unknown process types or statuses', () => {
    expect(normalizeLifiProcess('SOMETHING_ELSE', 'DONE')).toBeNull()
    expect(normalizeLifiProcess('SWAP', 'WEIRD')).toBeNull()
  })
})
