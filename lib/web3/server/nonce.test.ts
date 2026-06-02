import { describe, expect, it } from 'vitest'
import { issueNonce, consumeNonceCookie } from './nonce'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' as const

describe('nonce', () => {
  it('issues a 32-hex-char nonce', async () => {
    const { nonce } = await issueNonce(ADDR)
    expect(nonce).toMatch(/^[0-9a-f]{32}$/)
  })

  it('successive nonces are unique', async () => {
    const a = await issueNonce(ADDR)
    const b = await issueNonce(ADDR)
    expect(a.nonce).not.toBe(b.nonce)
  })

  it('round-trips the cookie value', async () => {
    const { nonce, cookieValue } = await issueNonce(ADDR)
    const consumed = await consumeNonceCookie(cookieValue)
    expect(consumed).not.toBeNull()
    expect(consumed!.nonce).toBe(nonce)
    expect(consumed!.address).toBe(ADDR)
  })

  it('returns null on tampered cookie', async () => {
    const { cookieValue } = await issueNonce(ADDR)
    const tampered = cookieValue.slice(0, -2) + 'aa'
    const consumed = await consumeNonceCookie(tampered)
    expect(consumed).toBeNull()
  })

  it('returns null on completely invalid cookie', async () => {
    const consumed = await consumeNonceCookie('not.a.jwt')
    expect(consumed).toBeNull()
  })
})
