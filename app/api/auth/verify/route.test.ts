import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { POST } from './route'
import { issueNonce } from '@/lib/web3/server/nonce'
import { buildSiweMessage } from '@/lib/web3/siwe'

const SIGNER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const
const account = privateKeyToAccount(SIGNER_KEY)
const ADDR = account.address

async function setupSignedSession(opts: { chainId?: number; nonceOverride?: string; addressOverride?: `0x${string}`; issuedAtOverride?: string; domainOverride?: string } = {}) {
  const { nonce, cookieValue } = await issueNonce(ADDR)
  const usedNonce = opts.nonceOverride ?? nonce
  const usedAddress = opts.addressOverride ?? ADDR
  const message = buildSiweMessage({
    domain: opts.domainOverride ?? 'localhost',
    address: usedAddress,
    uri: 'http://localhost',
    chainId: opts.chainId ?? 1,
    nonce: usedNonce,
    issuedAt: opts.issuedAtOverride ?? new Date().toISOString(),
    statement: 'Sign in to Aura.',
  })
  const signature = await account.signMessage({ message })
  return { message, signature, cookieValue }
}

function buildReq(body: unknown, cookieValue?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json', host: 'localhost' }
  if (cookieValue) headers['cookie'] = `siwe_nonce=${cookieValue}`
  return new NextRequest('http://localhost/api/auth/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/verify', () => {
  it('returns 200 + sets session cookie on valid signature', async () => {
    const { message, signature, cookieValue } = await setupSignedSession()
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ address: ADDR, chainId: 1 })
    expect(res.cookies.get('session')?.value).toBeTruthy()
    expect(res.cookies.get('siwe_nonce')?.value).toBe('')
  })

  it('returns 401 signature_invalid when signature is from a different key', async () => {
    const { message, cookieValue } = await setupSignedSession()
    const otherAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
    const wrongSig = await otherAccount.signMessage({ message })
    const res = await POST(buildReq({ message, signature: wrongSig }, cookieValue))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'signature_invalid' })
  })

  it('returns 400 chain_mismatch on wrong chainId', async () => {
    const { message, signature, cookieValue } = await setupSignedSession({ chainId: 10 })
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'chain_mismatch' })
  })

  it('returns 410 nonce_expired when cookie absent', async () => {
    const { message, signature } = await setupSignedSession()
    const res = await POST(buildReq({ message, signature }))
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'nonce_expired' })
  })

  it('returns 400 nonce_mismatch on cookie/message nonce divergence', async () => {
    const { message, signature, cookieValue } = await setupSignedSession({ nonceOverride: 'b'.repeat(32) })
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'nonce_mismatch' })
  })

  it('returns 400 domain_mismatch when message domain differs from request host', async () => {
    const { message, signature, cookieValue } = await setupSignedSession({ domainOverride: 'evil.example' })
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'domain_mismatch' })
  })

  it('returns 400 issued_at_skew when message is too old', async () => {
    const oldIssuedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { message, signature, cookieValue } = await setupSignedSession({ issuedAtOverride: oldIssuedAt })
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'issued_at_skew' })
  })

  it('returns 400 invalid_body on malformed json', async () => {
    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
