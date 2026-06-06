import { NextResponse, type NextRequest } from 'next/server'
import { getAddress, isAddress } from 'viem'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { loadWalletBalance } from '@/lib/web3/balances/loadWalletBalance'
import { readVaultPosition } from '@/lib/web3/hooks/useVaultPosition'
import type { Address } from '@/lib/web3/types'
import type { AdminUserValue } from '@/lib/admin/types'

const USDC_DECIMALS = 6

// Per-wallet on-chain valuation for the admin table. Each read is independent:
// an RPC failure on one surfaces as null ("Unavailable"), never a 500.
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const walletParam = req.nextUrl.searchParams.get('wallet')
  if (!walletParam || !isAddress(walletParam)) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 })
  }
  const wallet = getAddress(walletParam) as Address

  const [walletUsd, vaultUsd] = await Promise.all([
    loadWalletBalance(wallet)
      .then(b => b.totalUsd)
      .catch(() => null),
    readVaultPosition(wallet)
      .then(p => Number(p.depositedAssets) / 10 ** USDC_DECIMALS)
      .catch(() => null),
  ])

  const value: AdminUserValue = { walletUsd, vaultUsd }
  return NextResponse.json(value)
}
