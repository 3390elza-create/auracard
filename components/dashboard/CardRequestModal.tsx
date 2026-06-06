'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
  Coins,
  TrendingUp,
  Info,
} from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GradientButton } from '@/components/ui/GradientButton'
import { GhostButton } from '@/components/ui/GhostButton'
import { formatUSD, formatCompactUSD } from '@/lib/format'
import {
  CARD_TIERS,
  CARD_TIER_LIST,
  readSelectedCardTier,
  writeSelectedCardTier,
  shortfallUsd,
  nextFillAction,
  type CardTier,
  type CardTierId,
} from '@/lib/cards/tiers'
import { useEligibility } from '@/lib/web3/hooks/useEligibility'
import { useVaultPosition } from '@/lib/web3/hooks/useVaultPosition'
import { useCardApproval } from '@/lib/web3/hooks/useCardApproval'
import { useZapDeposit, type UseZapDeposit } from '@/lib/web3/hooks/useZapDeposit'
import { DEFAULT_ZAP_CONFIG } from '@/lib/web3/zap/types'
import { ZapProgressView } from './ZapProgressView'
import { AddFundsPanel } from './AddFundsPanel'
import type { Address } from '@/lib/web3/types'

const CARD_SWATCH: Record<CardTierId, string> = {
  white: 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-600',
  blue: 'bg-gradient-to-br from-aurora-blue to-aurora-violet text-white',
  metal: 'bg-gradient-to-br from-zinc-600 to-zinc-900 text-white',
}

type Step = 'intro' | 'processing' | 'fund'

const STATUS_LABEL: Record<string, string> = {
  ready: 'Preparing the deposit…',
  signing: 'Sign the permit in your wallet…',
  depositing: 'Confirm the deposit in your wallet…',
  confirming: 'Confirming on-chain…',
}

const ERROR_LABEL: Record<string, string> = {
  wrong_network: 'Switch to Polygon to continue.',
  insufficient_balance: 'You need USDC on Polygon to deposit into the vault.',
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
  // Tier the user picked in the marketing issue flow (carried via localStorage).
  const [tierId, setTierId] = useState<CardTierId>('white')
  const eligibility = useEligibility(address)
  const vault = useVaultPosition(address)
  const assets = eligibility.data?.balance.assets ?? []
  const zap = useZapDeposit(address, assets)
  const { state, requestCard, reset } = useCardApproval(usdcBalance)

  // True once we've auto-fired the conversion/deposit for the current
  // `processing` entry — guards against re-firing and against loops.
  const attemptedRef = useRef(false)

  // Stable handles — react-query guarantees these are referentially stable.
  const refetchVault = vault.refetch
  const refetchEligibility = eligibility.refetch

  // Read the persisted selection on mount (localStorage is client-only).
  useEffect(() => {
    const stored = readSelectedCardTier()
    if (stored) setTierId(stored)
  }, [])

  const tier = CARD_TIERS[tierId]
  const minUsd = tier.minBalanceUsd
  // The card unlocks against USDC already DEPOSITED in the vault, not wallet USDC.
  const depositedUsd = vault.data ? Number(vault.data.depositedAssets) / 1e6 : 0
  const vaultReady = vault.isSuccess
  const eligible = vaultReady && depositedUsd >= minUsd
  const eligibilityResolved = eligibility.isSuccess || eligibility.isError

  // canZap = wallet has convertible value above the floor that is NOT already
  // Polygon USDC. Polygon wallet USDC is depositable directly.
  const canZap = zap.plan.legs.length > 0
  const polygonUsdcUsd = Number(usdcBalance) / 1e6
  const hasMovableValue = canZap || polygonUsdcUsd >= DEFAULT_ZAP_CONFIG.floorUsd
  const action = nextFillAction({ depositedUsd, minUsd, hasMovableValue })

  // Re-read the vault/eligibility whenever a deposit completes.
  useEffect(() => {
    if (state.status === 'active') void refetchVault()
  }, [state.status, refetchVault])

  useEffect(() => {
    if (zap.phase === 'done') {
      void refetchVault()
      void refetchEligibility()
    }
  }, [zap.phase, refetchVault, refetchEligibility])

  // Auto-fire the conversion/deposit ONCE, after balances load on `processing`.
  useEffect(() => {
    if (step !== 'processing') return
    if (!eligibilityResolved || !vaultReady) return
    if (eligible || attemptedRef.current) return
    if (zap.isRunning || state.status !== 'ready') return
    attemptedRef.current = true
    if (action === 'convert') {
      if (canZap) void zap.start()
      else void requestCard()
    } else if (action === 'add_funds') {
      setStep('fund')
    }
  }, [step, eligibilityResolved, vaultReady, eligible, action, canZap, zap, state.status, requestCard])

  // After the conversion attempt completes but is still short, go to the deposit
  // step. (Success is handled at the top by `succeeded`; errors stay in
  // `processing` so the retry UI shows.)
  useEffect(() => {
    if (step !== 'processing' || !attemptedRef.current) return
    if ((zap.phase === 'done' || state.status === 'active') && !eligible) {
      setStep('fund')
    }
  }, [step, zap.phase, state.status, eligible])

  const busy =
    state.status === 'signing' ||
    state.status === 'depositing' ||
    state.status === 'confirming' ||
    zap.isRunning ||
    (step === 'processing' && !eligibilityResolved)
  const succeeded = eligible

  const retry = useCallback(async () => {
    reset()
    await requestCard()
  }, [reset, requestCard])

  const startRequest = useCallback(() => {
    attemptedRef.current = false
    setStep('processing')
  }, [])

  const recheck = useCallback(() => {
    void refetchEligibility()
    void refetchVault()
  }, [refetchEligibility, refetchVault])

  // Esc closes the modal — but never mid-transaction or after success.
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
        className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto p-stack-lg"
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
          <SuccessView depositedUsd={depositedUsd} onClose={onClose} />
        ) : step === 'intro' ? (
          <IntroStep onRequest={startRequest} />
        ) : step === 'processing' ? (
          <ProcessingStep
            vaultError={vault.isError}
            onRefreshVault={() => void refetchVault()}
            zap={zap}
            status={state.status}
            reason={state.status === 'error' ? state.reason : undefined}
            depositUsd={Number(usdcBalance) / 1e6}
            onRetry={retry}
            onErrorBack={() => {
              reset()
              setStep('fund')
            }}
          />
        ) : (
          <FundStep
            address={address}
            tier={tier}
            depositedUsd={depositedUsd}
            vaultReady={vaultReady}
            hasMovableValue={hasMovableValue}
            onSelectTier={(id) => {
              setTierId(id)
              writeSelectedCardTier(id)
            }}
            onConvert={startRequest}
            onClose={onClose}
            onRecheck={recheck}
            rechecking={eligibility.isFetching || vault.isFetching}
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
        We read your wallet balances on-chain — read-only. When you request your card we convert your
        eligible crypto to USDC and deposit it into a non-custodial vault; your card credit is up to
        80% of your deposit. Your funds stay non-custodial: withdrawal is always your exclusive right.
      </p>
      <GradientButton onClick={onRequest} size="lg" icon={<ArrowRight className="h-5 w-5" />}>
        Request card
      </GradientButton>
    </div>
  )
}

function ProcessingStep({
  vaultError,
  onRefreshVault,
  zap,
  status,
  reason,
  depositUsd,
  onRetry,
  onErrorBack,
}: {
  vaultError: boolean
  onRefreshVault: () => void
  zap: UseZapDeposit
  status: string
  reason?: string
  depositUsd: number
  onRetry: () => void
  onErrorBack: () => void
}) {
  // A direct (Polygon-USDC) deposit is in flight or has errored.
  const directEngaged =
    status === 'signing' || status === 'depositing' || status === 'confirming' || status === 'error'

  if (vaultError) {
    return (
      <div className="flex flex-col gap-5">
        <StepBadge current={2} total={3} />
        <div className="flex items-center gap-3 text-aurora-violet">
          <Wallet className="h-6 w-6" />
          <h2 className="text-headline-md text-text-primary">Funding your card</h2>
        </div>
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-lg border border-aurora-amber/40 bg-aurora-amber/10 px-3 py-2.5 text-label-sm text-aurora-amber"
        >
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Couldn&apos;t read your vault balance.
          </span>
          <button
            type="button"
            onClick={onRefreshVault}
            className="shrink-0 rounded-md px-2 py-1 font-semibold text-aurora-blue hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  // Direct deposit path: ApprovalStep is a self-contained layout.
  if (directEngaged) {
    return <ApprovalStep status={status} reason={reason} depositUsd={depositUsd} onRetry={onRetry} onBack={onErrorBack} />
  }

  return (
    <div className="flex flex-col gap-5">
      <StepBadge current={2} total={3} />
      <div className="flex items-center gap-3 text-aurora-violet">
        <Wallet className="h-6 w-6" />
        <h2 className="text-headline-md text-text-primary">Funding your card</h2>
      </div>

      {zap.isRunning || zap.phase === 'error' ? (
        <ZapProgressView run={zap.run} plan={zap.plan} error={zap.error} onRetry={zap.retry} />
      ) : (
        <div className="flex items-center gap-3 text-aurora-violet" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-label-md text-text-secondary">Reading your wallet…</p>
        </div>
      )}
    </div>
  )
}

function FundStep({
  address,
  tier,
  depositedUsd,
  vaultReady,
  hasMovableValue,
  onSelectTier,
  onConvert,
  onClose,
  onRecheck,
  rechecking,
}: {
  address: Address | undefined
  tier: CardTier
  depositedUsd: number
  vaultReady: boolean
  hasMovableValue: boolean
  onSelectTier: (id: CardTierId) => void
  onConvert: () => void
  onClose: () => void
  onRecheck: () => void
  rechecking: boolean
}) {
  const [picking, setPicking] = useState(false)
  const minUsd = tier.minBalanceUsd
  const remaining = shortfallUsd(tier, depositedUsd)
  const progressPercent = Math.min(100, Math.round((depositedUsd / minUsd) * 100))

  return (
    <div className="flex flex-col gap-5">
      <StepBadge current={3} total={3} />
      <div className="flex items-center gap-3 text-aurora-blue">
        <Wallet className="h-6 w-6" />
        <h2 className="text-headline-md text-text-primary">Add funds</h2>
      </div>

      <SelectedCard
        tier={tier}
        picking={picking}
        onTogglePicking={() => setPicking((v) => !v)}
        onSelectTier={(id) => {
          onSelectTier(id)
          setPicking(false)
        }}
      />

      {vaultReady && (
        <div className="rounded-xl border border-glass-border bg-white/5 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-label-md font-semibold text-text-primary">
              {remaining > 0 ? `${formatUSD(remaining)} to go` : 'Minimum reached'}
            </span>
            <span className="text-label-sm text-text-secondary">
              {formatUSD(depositedUsd)} of {formatUSD(minUsd)} {tier.name} minimum
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Deposited toward card minimum"
            aria-valuenow={Math.round(depositedUsd)}
            aria-valuemin={0}
            aria-valuemax={Math.round(minUsd)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-aurora-violet to-aurora-teal transition-[width]"
              style={{ width: `${progressPercent}%` }}
              aria-hidden
            />
          </div>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-label-sm text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Top up your connected wallet from another wallet or an exchange, then re-check — your crypto
        is converted and deposited automatically.
      </p>

      {address ? (
        <AddFundsPanel address={address} />
      ) : (
        <p className="text-label-sm text-text-secondary">Connect a wallet first.</p>
      )}

      {hasMovableValue && (
        <GradientButton onClick={onConvert} size="lg" icon={<ArrowRight className="h-5 w-5" />}>
          Convert &amp; deposit
        </GradientButton>
      )}
      <div className="flex gap-3">
        <GhostButton onClick={onClose} icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left">
          Close
        </GhostButton>
        {hasMovableValue ? (
          <GhostButton onClick={onRecheck} disabled={rechecking}>
            {rechecking ? 'Re-checking…' : 'Re-check balance'}
          </GhostButton>
        ) : (
          <GradientButton
            onClick={onRecheck}
            size="md"
            disabled={rechecking}
            icon={<ArrowRight className="h-5 w-5" />}
          >
            {rechecking ? 'Re-checking…' : 'Re-check balance'}
          </GradientButton>
        )}
      </div>
    </div>
  )
}

function SelectedCard({
  tier,
  picking,
  onTogglePicking,
  onSelectTier,
}: {
  tier: CardTier
  picking: boolean
  onTogglePicking: () => void
  onSelectTier: (id: CardTierId) => void
}) {
  return (
    <div className="rounded-xl border border-glass-border bg-white/5 p-3">
      <div className="flex items-center gap-3">
        <CardSwatch id={tier.id} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-label-md font-semibold text-text-primary">{tier.name} card</span>
            <span className="rounded-md bg-aurora-violet/15 px-1.5 py-0.5 text-label-sm font-bold text-aurora-violet">
              Min {formatCompactUSD(tier.minBalanceUsd)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Benefit icon={<Coins className="h-3 w-3" />} label={`${tier.cashback} cashback`} />
            {tier.monthlyYield && (
              <Benefit icon={<TrendingUp className="h-3 w-3" />} label={`${tier.monthlyYield}/mo yield`} />
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onTogglePicking}
          aria-expanded={picking}
          className="shrink-0 rounded-lg px-2.5 py-1 text-label-sm font-semibold text-aurora-blue transition-colors hover:bg-white/10"
        >
          {picking ? 'Close' : 'Change'}
        </button>
      </div>

      {picking && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-glass-border pt-3">
          {CARD_TIER_LIST.map((t) => {
            const active = t.id === tier.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTier(t.id)}
                aria-pressed={active}
                className={`flex items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'border-aurora-violet bg-aurora-violet/10'
                    : 'border-transparent bg-white/5 hover:bg-white/10'
                }`}
              >
                <CardSwatch id={t.id} />
                <div className="min-w-0 flex-1">
                  <span className="text-label-md font-semibold text-text-primary">{t.name}</span>
                  <span className="ml-2 text-label-sm text-text-secondary">
                    {t.cashback} cashback{t.monthlyYield ? ` · ${t.monthlyYield}/mo` : ''}
                  </span>
                </div>
                <span className="shrink-0 text-label-sm font-semibold text-text-secondary">
                  Min {formatCompactUSD(t.minBalanceUsd)}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-aurora-violet" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CardSwatch({ id }: { id: CardTierId }) {
  return (
    <div
      className={`flex h-8 w-12 shrink-0 flex-col justify-between rounded-md p-1 ${CARD_SWATCH[id]}`}
      aria-hidden
    >
      <span className="text-[5px] font-bold uppercase tracking-wider">Aura</span>
      <span className="h-1 w-3.5 rounded-sm bg-current opacity-40" />
    </div>
  )
}

function Benefit({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-label-sm font-medium text-text-primary">
      {icon}
      {label}
    </span>
  )
}

function ApprovalStep({
  status,
  reason,
  depositUsd,
  onRetry,
  onBack,
}: {
  status: string
  reason?: string
  depositUsd: number
  onRetry: () => void
  onBack: () => void
}) {
  const isError = status === 'error'
  return (
    <div className="flex flex-col gap-5">
      <StepBadge current={2} total={3} />
      <div className="flex items-center gap-3 text-aurora-blue">
        <ShieldCheck className="h-6 w-6" />
        <h2 className="text-headline-md text-text-primary">Approve in your wallet</h2>
      </div>

      <p className="text-body-md text-text-secondary">
        You&apos;ll deposit{' '}
        <span className="font-bold text-text-primary">{formatUSD(depositUsd)}</span> of USDC on
        Polygon into the non-custodial vault and receive $AURA shares — your card credit is 80% of
        your deposit. This is a bounded approval for exactly this amount — never unlimited.
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
          {reason === 'insufficient_balance' ? (
            <GradientButton onClick={onBack} size="md" icon={<ArrowRight className="h-5 w-5" />}>
              Add funds instead
            </GradientButton>
          ) : (
            <GradientButton onClick={onRetry} size="md">
              Try again
            </GradientButton>
          )}
        </div>
      )}
    </div>
  )
}

function SuccessView({
  depositedUsd,
  onClose,
}: {
  depositedUsd: number
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
        You have{' '}
        <span className="font-bold text-text-primary">{formatUSD(depositedUsd)}</span> of USDC in the
        non-custodial vault. Your card credit (80% of your deposit) is now active.
      </p>
      <GradientButton onClick={onClose} size="lg" icon={<ArrowRight className="h-5 w-5" />}>
        View my card
      </GradientButton>
    </div>
  )
}
