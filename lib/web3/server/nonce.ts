import { SignJWT, jwtVerify } from 'jose'
import { getAddress } from 'viem'
import { randomBytes } from 'node:crypto'
import type { Address } from '@/lib/web3/types'
import { readServerEnv } from '@/lib/web3/env'

export const NONCE_COOKIE = 'siwe_nonce'
export const NONCE_TTL_SECONDS = 300

function nonceKey(): Uint8Array {
  return new TextEncoder().encode(readServerEnv().nonceSecret)
}

export interface IssuedNonce {
  nonce: string
  cookieValue: string
}

export async function issueNonce(address: Address): Promise<IssuedNonce> {
  const nonce = randomBytes(16).toString('hex')
  const checksummed = getAddress(address)
  const now = Math.floor(Date.now() / 1000)
  const cookieValue = await new SignJWT({ nonce, address: checksummed })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + NONCE_TTL_SECONDS)
    .sign(nonceKey())
  return { nonce, cookieValue }
}

export interface ConsumedNonce {
  nonce: string
  address: Address
}

export async function consumeNonceCookie(token: string): Promise<ConsumedNonce | null> {
  try {
    const { payload } = await jwtVerify(token, nonceKey(), { algorithms: ['HS256'] })
    const nonce = payload.nonce as string | undefined
    const address = payload.address as string | undefined
    if (!nonce || !address) return null
    return { nonce, address: getAddress(address as Address) }
  } catch {
    return null
  }
}
