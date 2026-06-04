import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/admin/server/password'
import { signAdminSession } from '@/lib/admin/server/session'
import { ADMIN_SESSION_COOKIE } from '@/lib/admin/server/getAdminSession'
import { readAdminEnv } from '@/lib/admin/server/env'

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }
  const email = parsed.data.email.toLowerCase()
  const { password } = parsed.data

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    // Generic error: never reveal whether the email exists.
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const jwt = await signAdminSession({ adminId: admin.id, email: admin.email })
  const { adminSessionTtl } = readAdminEnv()
  const res = NextResponse.json({ email: admin.email })
  res.cookies.set(ADMIN_SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: adminSessionTtl,
  })
  return res
}
