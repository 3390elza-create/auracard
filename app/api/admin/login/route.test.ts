import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/prisma', () => ({ prisma: { admin: { findUnique: vi.fn() } } }))

import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/admin/server/password'
import { POST } from './route'

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret-test-secret-test-secret-1234'
})
beforeEach(() => {
  vi.mocked(prisma.admin.findUnique).mockReset()
})

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/login', () => {
  it('sets an admin_session cookie on correct credentials', async () => {
    const passwordHash = await hashPassword('right-pass')
    vi.mocked(prisma.admin.findUnique).mockResolvedValue({
      id: 'a1', email: 'admin@example.com', passwordHash, createdAt: new Date(),
    } as never)

    const res = await POST(req({ email: 'admin@example.com', password: 'right-pass' }))
    expect(res.status).toBe(200)
    expect(res.cookies.get('admin_session')?.value).toBeTruthy()
  })

  it('returns 401 on wrong password', async () => {
    const passwordHash = await hashPassword('right-pass')
    vi.mocked(prisma.admin.findUnique).mockResolvedValue({
      id: 'a1', email: 'admin@example.com', passwordHash, createdAt: new Date(),
    } as never)

    const res = await POST(req({ email: 'admin@example.com', password: 'wrong' }))
    expect(res.status).toBe(401)
    expect(res.cookies.get('admin_session')?.value).toBeFalsy()
  })

  it('returns 401 (generic) for an unknown email', async () => {
    vi.mocked(prisma.admin.findUnique).mockResolvedValue(null as never)
    const res = await POST(req({ email: 'nope@example.com', password: 'whatever' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'invalid_credentials' })
  })
})
