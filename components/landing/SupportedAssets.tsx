import Image from 'next/image'
import { Panel } from '@/components/ui/Panel'
import {
  SUPPORTED_NETWORKS,
  COLLATERAL_TOKENS,
  SUPPORTED_WALLETS,
  LTV,
} from '@/lib/content/marketing'

export function SupportedAssets() {
  return (
    <section id="assets" className="py-20 md:py-32">
      <div className="mb-16 space-y-4 text-center">
        <h2 className="text-headline-lg text-text-primary">What you can bring</h2>
        <p className="mx-auto max-w-2xl text-body-lg text-text-secondary">
          {LTV.headline} Connect on the networks you already use — no bridging, no
          selling your assets.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Panel rounded="xl" className="flex flex-col gap-6 p-stack-lg">
          <h3 className="text-headline-md text-text-primary">Supported networks</h3>
          <ul className="flex flex-wrap gap-3">
            {SUPPORTED_NETWORKS.map(network => (
              <li
                key={network}
                className="rounded-full border border-glass-border bg-surface-low px-4 py-2 text-label-md text-text-primary"
              >
                {network}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel rounded="xl" className="flex flex-col gap-6 p-stack-lg">
          <h3 className="text-headline-md text-text-primary">Accepted collateral</h3>
          <ul className="flex flex-wrap gap-3">
            {COLLATERAL_TOKENS.map(token => (
              <li
                key={token}
                className="rounded-full bg-aurora-violet/15 px-4 py-2 text-label-md font-bold text-aurora-violet"
              >
                {token}
              </li>
            ))}
          </ul>
          <p className="text-body-md text-text-secondary">
            Blue-chip assets (ETH, WBTC): up to {LTV.blueChip}%. Stablecoins (USDC):
            up to {LTV.stablecoin}%.
          </p>
        </Panel>
      </div>

      <div className="mt-8">
        <Panel rounded="xl" className="flex flex-col items-center gap-6 p-stack-lg">
          <h3 className="text-headline-md text-text-primary">Works with your wallet</h3>
          <ul className="flex flex-wrap items-center justify-center gap-8">
            {SUPPORTED_WALLETS.map(wallet => (
              <li key={wallet.name} className="flex items-center gap-3">
                <Image src={wallet.icon} alt="" width={28} height={28} aria-hidden />
                <span className="text-label-md text-text-secondary">{wallet.name}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  )
}
