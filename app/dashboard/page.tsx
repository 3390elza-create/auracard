'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ApprovalStepper } from '@/components/dashboard/ApprovalStepper'
import { EligibleBalancePanel } from '@/components/dashboard/EligibleBalancePanel'
import { EstimatedLimitPanel } from '@/components/dashboard/EstimatedLimitPanel'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { useDashboardMock } from '@/lib/mock/hooks'
import { useSession } from '@/lib/web3/hooks/useSession'
import { truncateAddress } from '@/lib/format'
import { getChainName } from '@/lib/web3/chains'
import type { WalletSession } from '@/lib/web3/types'

export default function DashboardPage() {
  const session = useSession()
  const data = useDashboardMock()

  if (session.status !== 'authenticated') return null

  const wallet: WalletSession = {
    address: session.address,
    addressShort: truncateAddress(session.address),
    chainId: session.chainId,
    chainName: getChainName(session.chainId),
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar wallet={wallet} />
      <main className="mx-auto w-full max-w-container-max flex-grow px-gutter py-stack-lg lg:ml-64 lg:px-margin-desktop">
        <DashboardHeader wallet={wallet} />
        <ApprovalStepper progress={data.progress} />
        <div className="mb-stack-lg grid grid-cols-1 gap-stack-lg md:grid-cols-2">
          <EligibleBalancePanel balance={data.balance} />
          <EstimatedLimitPanel  limit={data.limit} />
        </div>
        <ActivityTimeline events={data.timeline} />
      </main>
      <MobileTabBar />
    </div>
  )
}
