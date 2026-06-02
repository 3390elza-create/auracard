import { NextResponse, type NextRequest } from 'next/server'
import { verifySession } from '@/lib/web3/server/session'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return new NextResponse(null, { status: 401 })
  const session = await verifySession(token)
  if (!session) return new NextResponse(null, { status: 401 })
  return NextResponse.json({ address: session.address, chainId: session.chainId })
}
