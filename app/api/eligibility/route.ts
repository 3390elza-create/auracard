import { NextResponse, type NextRequest } from 'next/server'
import { verifySession } from '@/lib/web3/server/session'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'
import { fetchPortfolio } from '@/lib/web3/balances/portfolio'
import { portfolioNetworks, resolveAlchemyKey } from '@/lib/web3/balances/alchemyPortfolio'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return new NextResponse(null, { status: 401 })
  const session = await verifySession(token)
  if (!session) return new NextResponse(null, { status: 401 })

  const apiKey = resolveAlchemyKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'ALCHEMY_API_KEY not configured' }, { status: 500 })
  }

  try {
    // Always the session's own address — users only read their own balances.
    const balance = await fetchPortfolio(apiKey, session.address, portfolioNetworks())
    // bigint isn't JSON-serializable; send amountRaw as a string.
    return NextResponse.json({
      totalUsd: balance.totalUsd,
      assets: balance.assets.map((a) => ({ ...a, amountRaw: a.amountRaw.toString() })),
    })
  } catch {
    return NextResponse.json({ error: 'eligibility_read_failed' }, { status: 502 })
  }
}
