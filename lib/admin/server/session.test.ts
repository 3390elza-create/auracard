import { describe, it, expect, beforeAll } from 'vitest'
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
})
