import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { loadDailyVaultCredit, utcToday, withTodayRow } from '@/lib/admin/server/dailyCredit'

// Daily card-credit released = USDC deposited into the vault, bucketed by day.
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    // Always surface today (at zero if no deposits) so the table never collapses
    // to an empty state on a day with no wallet activity.
    const days = withTodayRow(await loadDailyVaultCredit(), utcToday())
    return NextResponse.json({ days })
  } catch {
    return NextResponse.json({ error: 'daily_credit_read_failed' }, { status: 502 })
  }
}
