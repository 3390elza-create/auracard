import { SignJWT, jwtVerify } from 'jose'
import { readAdminEnv } from './env'

export interface AdminSessionClaims {
  adminId: string
  email: string
  role: 'admin'
  iat: number
  exp: number
}

function adminKey(): Uint8Array {
  return new TextEncoder().encode(readAdminEnv().adminSessionSecret)
}

export async function signAdminSession(input: { adminId: string; email: string }): Promise<string> {
  const { adminSessionTtl } = readAdminEnv()
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ adminId: input.adminId, email: input.email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.adminId)
    .setIssuedAt(now)
    .setExpirationTime(now + adminSessionTtl)
    .sign(adminKey())
}

export async function verifyAdminSession(token: string): Promise<AdminSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, adminKey(), { algorithms: ['HS256'] })
    const adminId = payload.adminId as string | undefined
    const email = payload.email as string | undefined
    const role = payload.role as string | undefined
    const iat = payload.iat
    const exp = payload.exp
    if (!adminId || !email || role !== 'admin' || typeof iat !== 'number' || typeof exp !== 'number') {
      return null
    }
    return { adminId, email, role: 'admin', iat, exp }
  } catch {
    return null
  }
}
