import { cookies } from 'next/headers'
import { verifyAdminSession, type AdminSessionClaims } from './session'

export const ADMIN_SESSION_COOKIE = 'admin_session'

export async function getAdminSession(): Promise<AdminSessionClaims | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyAdminSession(token)
}
