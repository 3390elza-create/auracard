'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ApprovalStepper } from '@/components/dashboard/ApprovalStepper'
import { EligibleBalancePanel } from '@/components/dashboard/EligibleBalancePanel'
import { EstimatedLimitPanel } from '@/components/dashboard/EstimatedLimitPanel'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { CardRequestModal } from '@/components/dashboard/CardRequestModal'
import { CardVisualizer } from '@/components/card/CardVisualizer'
import { Panel } from '@/components/ui/Panel'
import { useSession } from '@/lib/web3/hooks/useSession'
import { useVaultPosition } from '@/lib/web3/hooks/useVaultPosition'
import { generateDemoCard } from '@/lib/card/generateDemoCard'
import { eightyPercent } from '@/lib/web3/vault/permit'
import { deriveProgress, deriveTimeline, type DashboardPhase } from '@/lib/dashboard/derive'
import { truncateAddress } from '@/lib/format'
import { getChainName } from '@/lib/web3/chains'
import type { WalletSession } from '@/lib/web3/types'
import type { EligibleBalance, EstimatedLimit } from '@/lib/dashboard/types'

export default function DashboardPage() {
  const session = useSession()
  const address = session.status === 'authenticated' ? session.address : undefined
  const position = useVaultPosition(address)

  // The card-request modal is the primary path: it opens automatically once we
  // know the wallet has no card yet, and stays mounted until the user dismisses
  // it (so its success screen survives the position refetch).
  const [modalOpen, setModalOpen] = useState(false)
  const [autoOpened, setAutoOpened] = useState(false)
  const needsCard = Boolean(address) && !position.isError && Boolean(position.data) && !position.data?.isActive
  useEffect(() => {
    if (needsCard && !autoOpened) {
      setModalOpen(true)
      setAutoOpened(true)
    }
  }, [needsCard, autoOpened])

  if (session.status !== 'authenticated') return null

  const wallet: WalletSession = {
    address: session.address,
    addressShort: truncateAddress(session.address),
    chainId: session.chainId,
    chainName: getChainName(session.chainId),
  }

  const pos = position.data
  const phase: DashboardPhase = position.isError ? 'error' : pos ? 'ready' : 'loading'

  const eligibleUsd = pos ? Number(pos.usdcBalance) / 1e6 : 0
  const provisionUsd = pos ? Number(eightyPercent(pos.usdcBalance)) / 1e6 : 0
  const depositedUsd = pos ? Number(pos.depositedAssets) / 1e6 : 0
  // Card credit is 80% of what's deposited in the vault; before the card is
  // active, show the estimate (80% of wallet USDC).
  const creditUsd = pos ? Number(eightyPercent(pos.depositedAssets)) / 1e6 : 0
  const limitUsd = pos?.isActive ? creditUsd : provisionUsd

  const balance: EligibleBalance = {
    totalUsd: eligibleUsd,
    assets:
      pos && pos.usdcBalance > 0n
        ? [{ symbol: 'USDC', name: 'Test USDC', amountRaw: pos.usdcBalance, decimals: 6, amountDisplay: (Number(pos.usdcBalance) / 1e6).toLocaleString('en-US'), usdValue: eligibleUsd }]
        : [],
  }
  const limit: EstimatedLimit = {
    limitUsd,
    utilizationPercent: 100,
    utilizationCaption: pos?.isActive ? 'Card active' : 'Up to 80% of your balance',
  }

  const derived = {
    phase,
    addressShort: wallet.addressShort,
    assetsCount: balance.assets.length,
    totalUsd: eligibleUsd,
    limitUsd,
  }

  const demoCard = pos?.isActive ? generateDemoCard(session.address, new Date().getFullYear()) : undefined

  return (
    <div className="flex min-h-screen">
      <Sidebar wallet={wallet} />
      <main className="mx-auto w-full max-w-container-max flex-grow px-gutter py-stack-lg lg:ml-64 lg:px-margin-desktop">
        <DashboardHeader wallet={wallet} />
        <ApprovalStepper progress={deriveProgress(derived)} />

        <div className="mb-stack-lg grid grid-cols-1 gap-stack-lg md:grid-cols-2">
          {phase === 'ready' && pos?.isActive && (
            <>
              <CardVisualizer card={demoCard} />
              <EstimatedLimitPanel limit={limit} />
            </>
          )}
          {phase === 'ready' && pos && !pos.isActive && (
            <>
              <EligibleBalancePanel balance={balance} />
              <EstimatedLimitPanel limit={limit} />
            </>
          )}
          {phase === 'loading' && (
            <Panel rounded="xl" className="p-stack-lg md:col-span-2">
              <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
            </Panel>
          )}
          {phase === 'error' && (
            <Panel rounded="xl" className="p-stack-lg md:col-span-2">
              <p className="text-body-md text-text-secondary">
                Couldn&apos;t read your Polygon position. This is read-only — your funds are untouched.
              </p>
            </Panel>
          )}
        </div>

        <ActivityTimeline events={deriveTimeline(derived)} />
      </main>
      <MobileTabBar />

      {modalOpen && pos && (
        <CardRequestModal
          address={session.address}
          usdcBalance={pos.usdcBalance}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
