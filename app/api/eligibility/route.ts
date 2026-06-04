import { NextResponse, type NextRequest } from 'next/server'
import { verifySession } from '@/lib/web3/server/session'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'
import { fetchPortfolio } from '@/lib/web3/balances/portfolio'

// Networks scanned for the eligible balance. One Alchemy key serves all of them
// via the Data API. Override with ELIGIBILITY_NETWORKS (comma-separated).
// All ids below have native-token metadata in NATIVE_META so native balances
// are valued, not just ERC-20s.
const DEFAULT_NETWORKS = [
  'eth-mainnet',
  'polygon-mainnet',
  'base-mainnet',
  'arb-mainnet',
  'opt-mainnet',
]

function networks(): string[] {
  const raw = process.env.ELIGIBILITY_NETWORKS
  if (!raw) return DEFAULT_NETWORKS
  return raw.split(',').map((n) => n.trim()).filter(Boolean)
}

// Prefer a dedicated server key; otherwise reuse the key already embedded in a
// configured Alchemy RPC URL (it is the same Alchemy account).
function resolveAlchemyKey(): string | null {
  const explicit = process.env.ALCHEMY_API_KEY
  if (explicit) return explicit
  for (const url of [process.env.NEXT_PUBLIC_RPC_URL_POLYGON, process.env.NEXT_PUBLIC_RPC_URL]) {
    const match = url?.match(/\/v2\/([^/?#]+)/)
    if (match) return match[1]
  }
  return null
}

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
    const balance = await fetchPortfolio(apiKey, session.address, networks())
    // bigint isn't JSON-serializable; send amountRaw as a string.
    return NextResponse.json({
      totalUsd: balance.totalUsd,
      assets: balance.assets.map((a) => ({ ...a, amountRaw: a.amountRaw.toString() })),
    })
  } catch {
    return NextResponse.json({ error: 'eligibility_read_failed' }, { status: 502 })
  }
}
