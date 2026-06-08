import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAddress, verifyMessage } from 'viem'
import { parseSiweMessage } from '@/lib/web3/siwe'
import { consumeNonceCookie, NONCE_COOKIE } from '@/lib/web3/server/nonce'
import { signSession } from '@/lib/web3/server/session'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'
import { readServerEnv } from '@/lib/web3/env'
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains'
import type { Address } from '@/lib/web3/types'
import { prisma } from '@/lib/db/prisma'

const BodySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  // Best-effort wallet connector name (e.g. MetaMask, Phantom, WalletConnect).
  // Client-supplied and display-only — never trusted for auth.
  walletProvider: z.string().trim().min(1).max(64).optional(),
})

const ISSUED_AT_SKEW_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { message, signature, walletProvider } = parsed.data

  const cookieValue = req.cookies.get(NONCE_COOKIE)?.value
  if (!cookieValue) {
    return NextResponse.json({ error: 'nonce_expired' }, { status: 410 })
  }
  const nonceData = await consumeNonceCookie(cookieValue)
  if (!nonceData) {
    return NextResponse.json({ error: 'nonce_expired' }, { status: 410 })
  }

  let parsedMessage
  try {
    parsedMessage = parseSiweMessage(message)
  } catch {
    return NextResponse.json({ error: 'invalid_siwe_message' }, { status: 400 })
  }

  if (parsedMessage.nonce !== nonceData.nonce) {
    return NextResponse.json({ error: 'nonce_mismatch' }, { status: 400 })
  }
  if (getAddress(parsedMessage.address) !== nonceData.address) {
    return NextResponse.json({ error: 'address_mismatch' }, { status: 400 })
  }
  if (parsedMessage.chainId !== DEFAULT_CHAIN_ID) {
    return NextResponse.json({ error: 'chain_mismatch' }, { status: 400 })
  }

  const host = req.headers.get('host')
  if (host && parsedMessage.domain !== host) {
    return NextResponse.json({ error: 'domain_mismatch' }, { status: 400 })
  }

  const issuedAt = new Date(parsedMessage.issuedAt).getTime()
  if (!issuedAt || Math.abs(Date.now() - issuedAt) > ISSUED_AT_SKEW_MS) {
    return NextResponse.json({ error: 'issued_at_skew' }, { status: 400 })
  }

  const isValid = await verifyMessage({
    address: nonceData.address,
    message,
    signature: signature as `0x${string}`,
  })
  if (!isValid) {
    return NextResponse.json({ error: 'signature_invalid' }, { status: 401 })
  }

  // Persist the connected wallet for the admin dashboard. Best-effort: a DB
  // hiccup must not block a user from logging in.
  try {
    await prisma.user.upsert({
      where: { walletAddress: nonceData.address },
      create: { walletAddress: nonceData.address, chainId: parsedMessage.chainId, walletProvider: walletProvider ?? null },
      // Only overwrite the stored provider when this login reported one, so a
      // later login that couldn't detect it doesn't wipe a known value.
      update: { chainId: parsedMessage.chainId, ...(walletProvider ? { walletProvider } : {}) },
    })
  } catch (err) {
    // Best-effort: login must not depend on the write. Log so a persistent
    // DB failure is diagnosable (the admin dashboard depends on this row).
    console.error('Failed to persist User on SIWE verify', err)
  }

  const jwt = await signSession({ address: nonceData.address, chainId: parsedMessage.chainId })
  const { sessionTtl } = readServerEnv()

  const res = NextResponse.json({ address: nonceData.address as Address, chainId: parsedMessage.chainId })
  res.cookies.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionTtl,
  })
  res.cookies.set(NONCE_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
