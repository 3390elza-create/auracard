import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import {
  loadDailyVaultCredit,
  groupConnectionsByDay,
  mergeDailyRows,
  utcToday,
} from '@/lib/admin/server/dailyCredit'

// Per day: wallets that connected (DB `firstSeenAt`) + USDC deposited into the
// vault (on-chain). Connections come from the DB and are always available; the
// on-chain deposit read is best-effort, so the panel still shows connections if
// the Alchemy read fails.
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const users = await prisma.user.findMany({ select: { firstSeenAt: true } })
  const connections = groupConnectionsByDay(users.map((u) => u.firstSeenAt.toISOString()))

  let deposits: Awaited<ReturnType<typeof loadDailyVaultCredit>> = []
  try {
    deposits = await loadDailyVaultCredit()
  } catch (err) {
    // Best-effort: keep showing connections even if the on-chain read fails.
    console.error('daily-credit: on-chain deposit read failed', err)
  }

  const days = mergeDailyRows(deposits, connections, utcToday())
  return NextResponse.json({ days })
}
