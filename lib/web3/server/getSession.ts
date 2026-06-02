import { cookies } from 'next/headers'
import { verifySession } from './session'
import type { SessionClaims } from '@/lib/web3/types'

export const SESSION_COOKIE = 'session'

export async function getSession(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}
