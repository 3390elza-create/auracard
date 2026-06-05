'use client'

import { useState } from 'react'
import { Check, Copy, Wallet } from 'lucide-react'
import type { Address } from '@/lib/web3/types'

/**
 * Non-custodial "add funds": show the connected wallet's own address so the user
 * can top it up from another wallet or an exchange, then convert/deposit. Funds
 * always land in the user's own wallet — the platform never holds them.
 */
export function AddFundsPanel({ address }: { address: Address }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — the address is still visible to copy manually
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-glass-border bg-white/5 p-4">
      <div className="flex items-center gap-2 text-aurora-blue">
        <Wallet className="h-4 w-4" />
        <span className="text-label-md font-semibold text-text-primary">Add funds to your wallet</span>
      </div>
      <p className="text-label-sm text-text-secondary">
        Send <span className="text-text-primary">USDC on Polygon</span> — or BTC / ETH / USDC on
        Ethereum, Base, Arbitrum, or Optimism — from another wallet or an exchange to your connected
        address below. Once it arrives, reopen this to convert &amp; deposit.
      </p>
      <div className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
        <code className="truncate font-mono text-label-sm text-text-primary">{address}</code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy address"
          className="shrink-0 rounded-md p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
        >
          {copied ? <Check className="h-4 w-4 text-aurora-teal" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-label-sm text-text-secondary">
        Only send on a supported network. Funds stay in your wallet until you deposit — non-custodial.
      </p>
    </div>
  )
}
