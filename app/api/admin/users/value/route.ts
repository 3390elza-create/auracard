import { NextResponse, type NextRequest } from 'next/server'
import { getAddress, isAddress } from 'viem'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { fetchPortfolio } from '@/lib/web3/balances/portfolio'
import { portfolioNetworks, resolveAlchemyKey } from '@/lib/web3/balances/alchemyPortfolio'
import { readVaultPosition } from '@/lib/web3/vault/readVaultPosition'
import type { Address } from '@/lib/web3/types'
import type { AdminUserValue } from '@/lib/admin/types'

const USDC_DECIMALS = 6

// Per-wallet on-chain valuation for the admin table. The wallet total is the
// full priced portfolio (every token across the configured networks), the same
// read the user's own dashboard uses, so admin and user see the same number.
// Each read is independent: a failure on one surfaces as null ("Unavailable"),
// never a 500.
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const walletParam = req.nextUrl.searchParams.get('wallet')
  if (!walletParam || !isAddress(walletParam)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 })
  }
  const wallet = getAddress(walletParam) as Address

  const apiKey = resolveAlchemyKey()

  const [walletUsd, vaultUsd] = await Promise.all([
    apiKey
      ? fetchPortfolio(apiKey, wallet, portfolioNetworks())
          .then(b => b.totalUsd)
          .catch(() => null)
      : Promise.resolve(null),
    readVaultPosition(wallet)
      .then(p => Number(p.depositedAssets) / 10 ** USDC_DECIMALS)
      .catch(() => null),
  ])

  const value: AdminUserValue = { walletUsd, vaultUsd }
  return NextResponse.json(value)
}
