import { BadgeCheck } from 'lucide-react'
import { truncateAddress } from '@/lib/format'
import type { WalletSession } from '@/lib/mock/types'

export function DashboardHeader({ wallet }: { wallet: WalletSession }) {
  return (
    <header className="mb-12 flex items-center justify-between">
      <div>
        <h1 className="text-headline-md text-text-primary">Hello 👋</h1>
        <p className="mt-1 text-body-md text-text-secondary">
          Welcome back to your Aura command center.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-aurora-violet/30 bg-glass-fill px-4 py-2 backdrop-blur-glass">
        <BadgeCheck className="h-5 w-5 text-aurora-violet" />
        <span className="text-label-md text-text-primary">{truncateAddress(wallet.address)}</span>
      </div>
    </header>
  )
}
