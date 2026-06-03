'use client'

import { RefreshCw } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ApprovalStepper } from '@/components/dashboard/ApprovalStepper'
import { EligibleBalancePanel } from '@/components/dashboard/EligibleBalancePanel'
import { EstimatedLimitPanel } from '@/components/dashboard/EstimatedLimitPanel'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { Panel } from '@/components/ui/Panel'
import { useSession } from '@/lib/web3/hooks/useSession'
import { useEligibility } from '@/lib/web3/hooks/useEligibility'
import { deriveProgress, deriveTimeline, type DashboardPhase } from '@/lib/dashboard/derive'
import { truncateAddress } from '@/lib/format'
import { getChainName } from '@/lib/web3/chains'
import type { WalletSession } from '@/lib/web3/types'

export default function DashboardPage() {
  const session = useSession()
  const address = session.status === 'authenticated' ? session.address : undefined
  const eligibility = useEligibility(address)

  if (session.status !== 'authenticated') return null

  const wallet: WalletSession = {
    address: session.address,
    addressShort: truncateAddress(session.address),
    chainId: session.chainId,
    chainName: getChainName(session.chainId),
  }

  const phase: DashboardPhase = eligibility.isError
    ? 'error'
    : eligibility.data
      ? 'ready'
      : 'loading'

  const derived = {
    phase,
    addressShort: wallet.addressShort,
    assetsCount: eligibility.data?.balance.assets.length ?? 0,
    totalUsd: eligibility.data?.balance.totalUsd ?? 0,
    limitUsd: eligibility.data?.limit.limitUsd ?? 0,
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar wallet={wallet} />
      <main className="mx-auto w-full max-w-container-max flex-grow px-gutter py-stack-lg lg:ml-64 lg:px-margin-desktop">
        <DashboardHeader wallet={wallet} />
        <ApprovalStepper progress={deriveProgress(derived)} />

        <div className="mb-stack-lg grid grid-cols-1 gap-stack-lg md:grid-cols-2">
          {phase === 'loading' && <BalanceSkeletons />}
          {phase === 'error' && (
            <ErrorPanel onRetry={() => eligibility.refetch()} />
          )}
          {phase === 'ready' && eligibility.data && (
            <>
              <EligibleBalancePanel balance={eligibility.data.balance} />
              <EstimatedLimitPanel limit={eligibility.data.limit} />
            </>
          )}
        </div>

        <ActivityTimeline events={deriveTimeline(derived)} />
      </main>
      <MobileTabBar />
    </div>
  )
}

function BalanceSkeletons() {
  return (
    <>
      {[0, 1].map(i => (
        <Panel key={i} rounded="xl" className="p-stack-lg">
          <div className="mb-6 h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="mb-8 h-10 w-40 animate-pulse rounded bg-white/10" />
          <div className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-white/5" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
          </div>
        </Panel>
      ))}
    </>
  )
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <Panel rounded="xl" className="flex flex-col items-start gap-4 p-stack-lg md:col-span-2">
      <h3 className="text-headline-md text-text-primary">Couldn&apos;t read your balances</h3>
      <p className="text-body-md text-text-secondary">
        We couldn&apos;t reach the networks to read your on-chain balances. This is a
        read-only request — your funds are untouched. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass-fill px-6 py-2.5 text-label-md font-bold text-text-primary transition-colors hover:bg-white/10"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </Panel>
  )
}
