import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { signSession } from '@/lib/web3/server/session'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' as const

function buildReq(cookieHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (cookieHeader) headers['cookie'] = cookieHeader
  return new NextRequest('http://localhost/api/auth/me', { headers })
}

describe('GET /api/auth/me', () => {
  it('returns 200 with address and chainId for a valid session cookie', async () => {
    const jwt = await signSession({ address: ADDR, chainId: 1 })
    const res = await GET(buildReq(`session=${jwt}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ address: ADDR, chainId: 1 })
  })

  it('returns 401 when no cookie present', async () => {
    const res = await GET(buildReq())
    expect(res.status).toBe(401)
  })

  it('returns 401 on invalid JWT', async () => {
    const res = await GET(buildReq('session=not.a.real.jwt'))
    expect(res.status).toBe(401)
  })
})
