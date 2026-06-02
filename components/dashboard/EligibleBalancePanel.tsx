import { Bitcoin, Hexagon, CircleDollarSign, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'
import { formatUSD } from '@/lib/format'
import type { AssetBalance, AssetSymbol, EligibleBalance } from '@/lib/mock/types'

type AssetVisual = { icon: ReactNode; tone: 'orange' | 'blue' | 'teal' }

const assetVisual: Record<AssetSymbol, AssetVisual> = {
  BTC:  { icon: <Bitcoin           className="h-4 w-4" />, tone: 'orange' },
  ETH:  { icon: <Hexagon           className="h-4 w-4" />, tone: 'blue'   },
  USDC: { icon: <CircleDollarSign  className="h-4 w-4" />, tone: 'teal'   },
}

export function EligibleBalancePanel({ balance }: { balance: EligibleBalance }) {
  return (
    <Panel rounded="xl" className="flex flex-col justify-between p-stack-lg">
      <div>
        <div className="mb-6 flex items-start justify-between">
          <h3 className="text-label-md uppercase tracking-widest text-text-secondary">
            Eligible balance
          </h3>
          <Wallet className="h-5 w-5 text-aurora-teal" />
        </div>
        <p className="mb-8 text-[32px] font-bold text-text-primary md:text-[40px]">
          {formatUSD(balance.totalUsd)}
        </p>
      </div>
      <div className="space-y-4">
        {balance.assets.map((asset: AssetBalance) => {
          const visual = assetVisual[asset.symbol]
          return (
            <div key={asset.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconBadge icon={visual.icon} tone={visual.tone} size="sm" />
                <span className="text-label-md text-text-primary">{asset.name}</span>
              </div>
              <span className="text-label-md text-text-secondary">
                {asset.amountDisplay} {asset.symbol}
              </span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
