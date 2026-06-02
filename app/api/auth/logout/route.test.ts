import { describe, expect, it } from 'vitest'
import { POST } from './route'

describe('POST /api/auth/logout', () => {
  it('returns 204 and clears session cookie', async () => {
    const res = await POST()
    expect(res.status).toBe(204)
    const cookie = res.cookies.get('session')
    expect(cookie?.value).toBe('')
    expect(cookie?.maxAge).toBe(0)
  })

  it('is idempotent (multiple calls succeed identically)', async () => {
    const a = await POST()
    const b = await POST()
    expect(a.status).toBe(204)
    expect(b.status).toBe(204)
  })
})
