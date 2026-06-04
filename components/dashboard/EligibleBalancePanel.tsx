import { Bitcoin, Hexagon, CircleDollarSign, Coins, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'
import { formatUSD } from '@/lib/format'
import type { AssetBalance, EligibleBalance } from '@/lib/dashboard/types'

type AssetVisual = { icon: ReactNode; tone: 'orange' | 'blue' | 'teal' | 'violet' }

// Known majors get a branded glyph; everything else falls back to its Alchemy
// logo or a generic coin icon.
const KNOWN_VISUAL: Record<string, AssetVisual> = {
  BTC:  { icon: <Bitcoin          className="h-4 w-4" />, tone: 'orange' },
  WBTC: { icon: <Bitcoin          className="h-4 w-4" />, tone: 'orange' },
  ETH:  { icon: <Hexagon          className="h-4 w-4" />, tone: 'blue'   },
  WETH: { icon: <Hexagon          className="h-4 w-4" />, tone: 'blue'   },
  USDC: { icon: <CircleDollarSign className="h-4 w-4" />, tone: 'teal'   },
  USDT: { icon: <CircleDollarSign className="h-4 w-4" />, tone: 'teal'   },
  POL:  { icon: <Hexagon          className="h-4 w-4" />, tone: 'violet' },
}

const MAX_ROWS = 6

function AssetIcon({ asset }: { asset: AssetBalance }) {
  const known = KNOWN_VISUAL[asset.symbol.toUpperCase()]
  if (known) return <IconBadge icon={known.icon} tone={known.tone} size="sm" />
  if (asset.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset.logo} alt="" className="h-8 w-8 rounded-full object-cover" />
  }
  return <IconBadge icon={<Coins className="h-4 w-4" />} tone="violet" size="sm" />
}

export function EligibleBalancePanel({ balance }: { balance: EligibleBalance }) {
  const rows = balance.assets.slice(0, MAX_ROWS)
  const extra = balance.assets.length - rows.length

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
        {rows.map((asset: AssetBalance) => (
          <div key={`${asset.symbol}-${asset.amountRaw}`} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AssetIcon asset={asset} />
              <span className="text-label-md text-text-primary">{asset.name}</span>
            </div>
            <span className="text-label-md text-text-secondary">
              {asset.amountDisplay} {asset.symbol}
            </span>
          </div>
        ))}
        {extra > 0 && (
          <p className="text-label-sm text-text-secondary">
            + {extra} more token{extra > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </Panel>
  )
}
