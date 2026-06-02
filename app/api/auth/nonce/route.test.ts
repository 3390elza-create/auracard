import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'

function buildReq(body: unknown, ip = '127.0.0.1'): NextRequest {
  return new NextRequest('http://localhost/api/auth/nonce', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/nonce', () => {
  it('returns 200 with a nonce and sets siwe_nonce cookie for a valid address', async () => {
    const res = await POST(buildReq({ address: ADDR }, '10.0.0.1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nonce).toMatch(/^[0-9a-f]{32}$/)
    const cookie = res.cookies.get('siwe_nonce')
    expect(cookie?.value).toBeTruthy()
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
  })

  it('returns 400 invalid_address for a bad address', async () => {
    const res = await POST(buildReq({ address: 'not-an-address' }, '10.0.0.2'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_address' })
  })

  it('returns 400 invalid_body when address missing', async () => {
    const res = await POST(buildReq({}, '10.0.0.3'))
    expect(res.status).toBe(400)
  })

  it('rate limits the 11th request from the same IP within the window', async () => {
    const ip = '10.0.0.4'
    for (let i = 0; i < 10; i++) {
      const ok = await POST(buildReq({ address: ADDR }, ip))
      expect(ok.status).toBe(200)
    }
    const blocked = await POST(buildReq({ address: ADDR }, ip))
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ error: 'rate_limited' })
  })
})
