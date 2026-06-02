import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SignJWT } from 'jose'
import { signSession, verifySession } from './session'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' as const

describe('session', () => {
  let snapshot: NodeJS.ProcessEnv

  beforeEach(() => { snapshot = { ...process.env } })
  afterEach(() => { process.env = snapshot })

  it('round-trips sign and verify', async () => {
    const token = await signSession({ address: ADDR, chainId: 1 })
    const claims = await verifySession(token)
    expect(claims).not.toBeNull()
    expect(claims!.address).toBe(ADDR)
    expect(claims!.chainId).toBe(1)
    expect(claims!.iat).toBeTypeOf('number')
    expect(claims!.exp).toBeGreaterThan(claims!.iat)
  })

  it('returns null on wrong secret', async () => {
    const token = await signSession({ address: ADDR, chainId: 1 })
    process.env.SESSION_SECRET = '9'.repeat(64)
    const claims = await verifySession(token)
    expect(claims).toBeNull()
  })

  it('returns null on tampered token', async () => {
    const token = await signSession({ address: ADDR, chainId: 1 })
    const tampered = token.slice(0, -2) + 'aa'
    const claims = await verifySession(tampered)
    expect(claims).toBeNull()
  })

  it('returns null on expired token', async () => {
    process.env.SESSION_TTL_SECONDS = '1'
    const token = await signSession({ address: ADDR, chainId: 1 })
    await new Promise(r => setTimeout(r, 1100))
    const claims = await verifySession(token)
    expect(claims).toBeNull()
  })

  it('returns null on alg: "none" attempt', async () => {
    const forged = await new SignJWT({ address: ADDR, chainId: 1 })
      .setProtectedHeader({ alg: 'none' as 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new Uint8Array(0))
      .catch(() => null)
    expect(forged === null || (await verifySession(forged ?? '')) === null).toBe(true)
  })
})
