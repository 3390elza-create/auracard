'use client'

import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GradientButton } from '@/components/ui/GradientButton'
import { formatUSD } from '@/lib/format'
import { eightyPercent } from '@/lib/web3/vault/permit'
import { useCardApproval } from '@/lib/web3/hooks/useCardApproval'
import type { VaultPosition } from '@/lib/web3/hooks/useVaultPosition'

const STATUS_LABEL: Record<string, string> = {
  signing: 'Sign the permit in your wallet…',
  depositing: 'Confirm the deposit…',
  confirming: 'Confirming on-chain…',
}

const ERROR_LABEL: Record<string, string> = {
  wrong_network: 'Switch to Base Sepolia to continue.',
  insufficient_balance: 'You need test USDC first — mint some to continue.',
  rejected_signature: 'Signature cancelled. You can try again.',
  rejected_tx: 'Transaction cancelled. You can try again.',
  tx_failed: 'The transaction failed. Please try again.',
  network_error: 'Network error. Please try again.',
}

export function CardActivationPanel({ position }: { position: VaultPosition }) {
  const { state, requestCard, reset } = useCardApproval(position.usdcBalance)
  const provision = eightyPercent(position.usdcBalance)
  const busy = state.status === 'signing' || state.status === 'depositing' || state.status === 'confirming'

  return (
    <Panel rounded="xl" className="flex flex-col gap-4 p-stack-lg md:col-span-2">
      <div className="flex items-center gap-2 text-aurora-teal">
        <ShieldCheck className="h-5 w-5" />
        <h3 className="text-headline-md text-text-primary">Activate your Aura Card</h3>
      </div>
      <p className="text-body-md text-text-secondary">
        Provision <span className="font-bold text-text-primary">{formatUSD(Number(provision) / 1e6)}</span>{' '}
        (80% of your test USDC) into the non-custodial vault and receive $AURA shares.
        Withdrawal is always your exclusive right.
      </p>

      {busy && <p className="text-label-md text-aurora-violet">{STATUS_LABEL[state.status]}</p>}
      {state.status === 'error' && (
        <p className="text-label-md text-error">{ERROR_LABEL[state.reason]}</p>
      )}

      <div className="flex gap-stack-md">
        <GradientButton onClick={requestCard} size="lg">
          {busy ? 'Processing…' : 'Request my Aura Card'}
        </GradientButton>
        {state.status === 'error' && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass-fill px-6 py-2.5 text-label-md font-bold text-text-primary transition-colors hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </button>
        )}
      </div>
    </Panel>
  )
}
