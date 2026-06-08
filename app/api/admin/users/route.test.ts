import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/server/getAdminSession', () => ({
  getAdminSession: vi.fn(),
  ADMIN_SESSION_COOKIE: 'admin_session',
}))
vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { findMany: vi.fn() } } }))

import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { prisma } from '@/lib/db/prisma'
import { GET } from './route'

beforeEach(() => {
  vi.mocked(getAdminSession).mockReset()
  vi.mocked(prisma.user.findMany).mockReset()
})

describe('GET /api/admin/users', () => {
  it('returns 401 without an admin session', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns persisted rows only — no on-chain reads', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      adminId: 'a1', email: 'admin@example.com', role: 'admin', iat: 1, exp: 2,
    })
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'u1',
        walletAddress: '0x1111111111111111111111111111111111111111',
        chainId: 1,
        walletProvider: 'MetaMask',
        cardStatus: 'pending',
        firstSeenAt: new Date('2026-06-01T00:00:00Z'),
        lastLoginAt: new Date('2026-06-02T00:00:00Z'),
      },
    ] as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.users).toHaveLength(1)
    expect(json.users[0]).toEqual({
      walletAddress: '0x1111111111111111111111111111111111111111',
      chainId: 1,
      walletProvider: 'MetaMask',
      cardStatus: 'pending',
      firstSeenAt: '2026-06-01T00:00:00.000Z',
      lastLoginAt: '2026-06-02T00:00:00.000Z',
    })
    // The list must not carry valuations — those load lazily per wallet.
    expect(json.users[0]).not.toHaveProperty('totalUsd')
  })
})
