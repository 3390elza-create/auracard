import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  return NextResponse.json({ email: session.email })
}
