import { describe, it, expect, beforeAll } from 'vitest'
import { SignJWT } from 'jose'
import { signAdminSession, verifyAdminSession } from './session'

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret-test-secret-test-secret-1234'
})

describe('admin session', () => {
  it('signs and verifies a round-trip token', async () => {
    const token = await signAdminSession({ adminId: 'abc123', email: 'admin@example.com' })
    const claims = await verifyAdminSession(token)
    expect(claims?.adminId).toBe('abc123')
    expect(claims?.email).toBe('admin@example.com')
    expect(claims?.role).toBe('admin')
  })

  it('returns null for a tampered token', async () => {
    const token = await signAdminSession({ adminId: 'abc123', email: 'admin@example.com' })
    expect(await verifyAdminSession(token + 'x')).toBeNull()
  })

  it('returns null for garbage', async () => {
    expect(await verifyAdminSession('not-a-jwt')).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const secret = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET)
    const past = Math.floor(Date.now() / 1000) - 60
    const expired = await new SignJWT({ adminId: 'abc123', email: 'admin@example.com', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('abc123')
      .setIssuedAt(past - 60)
      .setExpirationTime(past)
      .sign(secret)
    expect(await verifyAdminSession(expired)).toBeNull()
  })
})
