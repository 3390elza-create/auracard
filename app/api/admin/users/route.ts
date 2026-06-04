import { NextResponse } from 'next/server'
import { getAddress } from 'viem'
import { prisma } from '@/lib/db/prisma'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { loadWalletBalance } from '@/lib/web3/balances/loadWalletBalance'
import type { Address } from '@/lib/web3/types'
import type { AdminUserRow } from '@/lib/admin/types'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const users = await prisma.user.findMany({ orderBy: { firstSeenAt: 'desc' } })
  const rows: AdminUserRow[] = await Promise.all(
    users.map(async user => {
      let totalUsd: number | null = null
      try {
        const balance = await loadWalletBalance(getAddress(user.walletAddress) as Address)
        totalUsd = balance.totalUsd
      } catch {
        totalUsd = null // RPC failure surfaces as "unavailable", never a 500
      }
      return {
        walletAddress: user.walletAddress,
        chainId: user.chainId,
        cardStatus: user.cardStatus,
        firstSeenAt: user.firstSeenAt.toISOString(),
        lastLoginAt: user.lastLoginAt.toISOString(),
        totalUsd,
      }
    }),
  )
  return NextResponse.json({ users: rows })
}
