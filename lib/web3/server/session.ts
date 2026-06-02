import { SignJWT, jwtVerify } from 'jose'
import { getAddress } from 'viem'
import type { Address, SessionClaims } from '@/lib/web3/types'
import { readServerEnv } from '@/lib/web3/env'

function sessionKey(): Uint8Array {
  return new TextEncoder().encode(readServerEnv().sessionSecret)
}

export async function signSession(input: { address: Address; chainId: number }): Promise<string> {
  const { sessionTtl } = readServerEnv()
  const now = Math.floor(Date.now() / 1000)
  const address = getAddress(input.address)
  return new SignJWT({ address, chainId: input.chainId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(address)
    .setIssuedAt(now)
    .setExpirationTime(now + sessionTtl)
    .sign(sessionKey())
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ['HS256'] })
    const address = payload.address as string | undefined
    const chainId = payload.chainId as number | undefined
    const iat = payload.iat
    const exp = payload.exp
    if (!address || typeof chainId !== 'number' || typeof iat !== 'number' || typeof exp !== 'number') {
      return null
    }
    return { address: getAddress(address as Address), chainId, iat, exp }
  } catch {
    return null
  }
}
