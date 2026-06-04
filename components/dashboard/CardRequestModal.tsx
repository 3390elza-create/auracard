'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ShieldCheck,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GradientButton } from '@/components/ui/GradientButton'
import { GhostButton } from '@/components/ui/GhostButton'
import { Chip } from '@/components/ui/Chip'
import { formatUSD } from '@/lib/format'
import { eightyPercent } from '@/lib/web3/vault/permit'
import { useEligibility } from '@/lib/web3/hooks/useEligibility'
import { useCardApproval } from '@/lib/web3/hooks/useCardApproval'
import type { Address } from '@/lib/web3/types'

type Step = 'intro' | 'analysis' | 'approval'

const STATUS_LABEL: Record<string, string> = {
  ready: 'Preparing the request…',
  signing: 'Sign the permit in your wallet…',
  depositing: 'Confirm the deposit in your wallet…',
  confirming: 'Confirming on-chain…',
}

const ERROR_LABEL: Record<string, string> = {
  wrong_network: 'Switch to Polygon to continue.',
  insufficient_balance: 'You need USDC on Polygon to provision your card.',
  rejected_signature: 'Signature cancelled. You can try again.',
  rejected_tx: 'Transaction cancelled. You can try again.',
  tx_failed: 'The transaction failed. Please try again.',
  network_error: 'Network error. Please try again.',
}

export function CardRequestModal({
  address,
  usdcBalance,
  onClose,
}: {
  address: Address
  usdcBalance: bigint
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>('intro')
  const eligibility = useEligibility(address)
  const { state, requestCard, reset } = useCardApproval(usdcBalance)

  const busy =
    state.status === 'signing' ||
    state.status === 'depositing' ||
    state.status === 'confirming' ||
    (step === 'approval' && state.status === 'ready')
  const succeeded = state.status === 'active'

  // Exact amount provisioned on-chain (80% of the user's Base USDC balance).
  // Frozen at mount: after the deposit the balance drops, but the success
  // screen must still show what was actually provisioned.
  const [provisionUsd] = useState(() => Number(eightyPercent(usdcBalance)) / 1e6)

  const advance = useCallback(async () => {
    setStep('approval')
    await requestCard()
  }, [requestCard])

  const retry = useCallback(async () => {
    reset()
    await requestCard()
  }, [reset, requestCard])

  // Esc closes the modal — but never mid-transaction or after success
  // (success is dismissed via the explicit button so the user sees it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy && !succeeded) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, succeeded, onClose])

  const canDismiss = !busy && !succeeded

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-gutter backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Request your Aura Card"
      onClick={() => canDismiss && onClose()}
    >
      <Panel
        rounded="xl"
        className="relative w-full max-w-lg p-stack-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {canDismiss && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {succeeded ? (
          <SuccessView provisionUsd={provisionUsd} onClose={onClose} />
        ) : step === 'intro' ? (
          <IntroStep onRequest={() => setStep('analysis')} />
        ) : step === 'analysis' ? (
          <AnalysisStep
            loading={eligibility.isLoading}
            error={eligibility.isError}
            totalUsd={eligibility.data?.balance.totalUsd ?? 0}
            creditUsd={eligibility.data?.limit.limitUsd ?? provisionUsd}
            assetCount={eligibility.data?.balance.assets.length ?? 0}
            onBack={() => setStep('intro')}
            onAdvance={advance}
          />
        ) : (
          <ApprovalStep
            status={state.status}
            reason={state.status === 'error' ? state.reason : undefined}
            provisionUsd={provisionUsd}
            onRetry={retry}
            onBack={() => {
              reset()
              setStep('analysis')
            }}
          />
        )}
      </Panel>
    </div>
  )
}

function StepBadge({ current, total }: { current: number; total: number }) {
  return (
    <p className="text-label-sm uppercase tracking-widest text-text-secondary">
      Step {current} of {total}
    </p>
  )
}

function IntroStep({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <StepBadge current={1} total={3} />
      <div className="flex items-center gap-3 text-aurora-teal">
        <ShieldCheck className="h-6 w-6" />
        <h2 className="text-headline-md text-text-primary">Request your Aura Card</h2>
      </div>
      <p className="text-body-md text-text-secondary">
        We read your wallet balances on-chain — read-only — and extend up to 80% of
        your assets as spendable card credit. Your funds stay non-custodial: withdrawal
        is always your exclusive right.
      </p>
      <GradientButton onClick={onRequest} size="lg" icon={<ArrowRight className="h-5 w-5" />}>
        Request card
      </GradientButton>
    </div>
  )
}

function AnalysisStep({
  loading,
  error,
  totalUsd,
  creditUsd,
  assetCount,
  onBack,
  onAdvance,
}: {
  loading: boolean
  error: boolean
  totalUsd: number
  creditUsd: number
  assetCount: number
  onBack: () => void
  onAdvance: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <StepBadge current={2} total={3} />
      <div className="flex items-center gap-3 text-aurora-violet">
        <Wallet className="h-6 w-6" />
        <h2 className="text-headline-md text-text-primary">Wallet analysis</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 w-48 animate-pulse rounded-lg bg-white/10" />
          <div className="h-6 w-full animate-pulse rounded bg-white/10" />
        </div>
      ) : (
        <>
          <div>
            <p className="text-label-md uppercase tracking-widest text-text-secondary">
              Total assets detected
            </p>
            <p className="text-[32px] font-bold text-text-primary md:text-[40px]">
              {formatUSD(totalUsd)}
            </p>
            {assetCount > 0 && (
              <p className="text-label-sm text-text-secondary">
                Across {assetCount} asset{assetCount > 1 ? 's' : ''} on multiple networks
              </p>
            )}
          </div>

          <Panel rounded="lg" className="flex items-center justify-between p-4">
            <div>
              <p className="text-label-sm uppercase tracking-wider text-text-secondary">
                Card credit (80%)
              </p>
              <p className="text-headline-md font-bold text-aurora-teal">
                {formatUSD(creditUsd)}
              </p>
            </div>
            <Chip tone="teal">
              <span className="h-2 w-2 rounded-full bg-aurora-teal" />
              80% of assets
            </Chip>
          </Panel>

          <p className="text-label-sm text-text-secondary">
            {error
              ? "We couldn't read every network — you can still provision your available USDC on Polygon."
              : 'On approval, your provision settles in USDC on Polygon and you receive vault shares.'}
          </p>
        </>
      )}

      <div className="flex gap-3">
        <GhostButton onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left">
          Back
        </GhostButton>
        <GradientButton onClick={onAdvance} size="md" icon={<ArrowRight className="h-5 w-5" />}>
          Continue
        </GradientButton>
      </div>
    </div>
  )
}

function ApprovalStep({
  status,
  reason,
  provisionUsd,
  onRetry,
  onBack,
}: {
  status: string
  reason?: string
  provisionUsd: number
  onRetry: () => void
  onBack: () => void
}) {
  const isError = status === 'error'
  return (
    <div className="flex flex-col gap-5">
      <StepBadge current={3} total={3} />
      <div className="flex items-center gap-3 text-aurora-blue">
        <ShieldCheck className="h-6 w-6" />
        <h2 className="text-headline-md text-text-primary">Approve in your wallet</h2>
      </div>

      <p className="text-body-md text-text-secondary">
        You&apos;ll provision{' '}
        <span className="font-bold text-text-primary">{formatUSD(provisionUsd)}</span> of USDC
        on Polygon into the non-custodial vault and receive $AURA shares. This is a bounded
        approval for exactly this amount — never unlimited.
      </p>

      {!isError ? (
        <div className="flex items-center gap-3 text-aurora-violet">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-label-md">{STATUS_LABEL[status] ?? STATUS_LABEL.ready}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-error">
          <AlertCircle className="h-5 w-5" />
          <p className="text-label-md">{ERROR_LABEL[reason ?? 'network_error']}</p>
        </div>
      )}

      {isError && (
        <div className="flex gap-3">
          <GhostButton onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left">
            Back
          </GhostButton>
          <GradientButton onClick={onRetry} size="md">
            Try again
          </GradientButton>
        </div>
      )}
    </div>
  )
}

function SuccessView({
  provisionUsd,
  onClose,
}: {
  provisionUsd: number
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-aurora-teal/20 text-aurora-teal">
        <Check className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 text-aurora-teal">
        <Sparkles className="h-5 w-5" />
        <h2 className="text-headline-md text-text-primary">Your Aura Card is ready</h2>
      </div>
      <p className="text-body-md text-text-secondary">
        You provisioned <span className="font-bold text-text-primary">{formatUSD(provisionUsd)}</span>{' '}
        of USDC and received $AURA vault shares. Your card credit is now active.
      </p>
      <GradientButton onClick={onClose} size="lg" icon={<ArrowRight className="h-5 w-5" />}>
        View my card
      </GradientButton>
    </div>
  )
}
