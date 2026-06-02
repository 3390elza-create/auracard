import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { isAddress, getAddress } from 'viem'
import { issueNonce, NONCE_COOKIE, NONCE_TTL_SECONDS } from '@/lib/web3/server/nonce'
import type { Address } from '@/lib/web3/types'

const BodySchema = z.object({
  address: z.string().refine(isAddress, 'invalid_address'),
})

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function allow(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (bucket.count >= RATE_LIMIT) return false
  bucket.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_address' }, { status: 400 })
  }

  const address = getAddress(parsed.data.address) as Address
  const { nonce, cookieValue } = await issueNonce(address)

  const res = NextResponse.json({ nonce })
  res.cookies.set(NONCE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: NONCE_TTL_SECONDS,
  })
  return res
}
