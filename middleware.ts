import { NextResponse, type NextRequest } from 'next/server'
import { verifySession } from '@/lib/web3/server/session'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'

export const config = {
  matcher: ['/dashboard/:path*'],
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/connect'
    url.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}
