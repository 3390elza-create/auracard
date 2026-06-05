'use client'

import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import type { LegState, LegStatus, ZapRunState } from '@/lib/web3/zap/machine'
import type { ZapPlan } from '@/lib/web3/zap/types'

const CHAIN_LABEL: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
}

const STATUS_LABEL: Record<LegStatus, string> = {
  idle: 'Queued',
  quoting: 'Finding best route…',
  awaiting_approval: 'Approve in your wallet…',
  swapping: 'Swapping…',
  bridging: 'Bridging to Polygon…',
  arriving: 'Arriving on Polygon…',
  depositing: 'Depositing…',
  done: 'Done',
  error: 'Failed',
}

function LegRow({ leg }: { leg: LegState }) {
  const label = CHAIN_LABEL[leg.chainId] ?? `Chain ${leg.chainId}`
  const icon =
    leg.status === 'done' ? (
      <Check className="h-4 w-4 text-aurora-teal" />
    ) : leg.status === 'error' ? (
      <AlertCircle className="h-4 w-4 text-error" />
    ) : (
      <Loader2 className="h-4 w-4 animate-spin text-aurora-violet" />
    )
  return (
    <li className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-label-sm">
      <span className="text-text-primary">{label}</span>
      <span className="flex items-center gap-2 text-text-secondary">
        {leg.status === 'error' ? (leg.error?.reason ?? 'Failed') : STATUS_LABEL[leg.status]}
        {icon}
      </span>
    </li>
  )
}

/**
 * Per-leg progress for the cross-chain zap: one row per source chain with a
 * friendly status, plus the count of tokens skipped (below floor / gas reserve).
 */
export function ZapProgressView({
  run,
  plan,
  error,
  onRetry,
}: {
  run: ZapRunState | null
  plan: ZapPlan
  error?: string | null
  onRetry?: () => void
}) {
  const legs = run?.legs ?? []
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Conversion progress" className="flex flex-col gap-2">
        {legs.map((leg) => (
          <LegRow key={leg.chainId} leg={leg} />
        ))}
      </ul>

      {plan.skipped.length > 0 && (
        <p className="text-label-sm text-text-secondary">
          {plan.skipped.length} small balance{plan.skipped.length > 1 ? 's' : ''} skipped (below the
          minimum, or kept for gas).
        </p>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 text-label-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {error && onRetry && (
        <GradientButton onClick={onRetry} size="md">
          Try again
        </GradientButton>
      )}
    </div>
  )
}
