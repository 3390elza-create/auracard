import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import type { AdminUserRow } from '@/lib/admin/types'

// Returns persisted user rows only — no on-chain reads. The expensive wallet and
// vault valuations are fetched lazily, per wallet, via /api/admin/users/value so
// this list renders instantly regardless of how many users exist.
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const users = await prisma.user.findMany({ orderBy: { firstSeenAt: 'desc' } })
  const rows: AdminUserRow[] = users.map(user => ({
    walletAddress: user.walletAddress,
    chainId: user.chainId,
    walletProvider: user.walletProvider ?? null,
    cardStatus: user.cardStatus,
    firstSeenAt: user.firstSeenAt.toISOString(),
    lastLoginAt: user.lastLoginAt.toISOString(),
  }))
  return NextResponse.json({ users: rows })
}
