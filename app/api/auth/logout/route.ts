import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'

export async function POST() {
  const res = new NextResponse(null, { status: 204 })
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
