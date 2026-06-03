'use client'

import { useEffect, useState } from 'react'
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Wallet,
  Wifi,
  Loader2,
} from 'lucide-react'
import { ISSUE_CARDS, type IssueCardId, type IssueCardOption } from '../content'
import { useSiweLogin } from '@/lib/web3/hooks/useSiweLogin'
import type { SiweLoginError } from '@/lib/web3/types'

type Step = 'card' | 'review' | 'connect'

const CARD_THUMB: Record<IssueCardId, string> = {
  white: 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-600',
  blue: 'bg-gradient-to-br from-primary to-primary-dark text-white',
  metal: 'bg-gradient-to-br from-zinc-700 to-zinc-900 text-white',
}

const CONNECT_ERROR: Record<SiweLoginError, string> = {
  user_rejected_connect: 'Connection cancelled. Try again when you’re ready.',
  user_rejected_signature: 'Sign-in cancelled. We need the signature to link your wallet.',
  wrong_chain: 'Switch to the supported network and try again.',
  nonce_failed: 'Could not start sign-in. Try again.',
  verify_failed: 'Sign-in failed. Try again.',
  network_error: 'Network error. Check your connection and try again.',
}

export function IssueCardFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('card')
  const [selectedId, setSelectedId] = useState<IssueCardId>('white')
  const { state, start } = useSiweLogin()

  const connecting =
    state.status === 'connecting' ||
    state.status === 'requesting_nonce' ||
    state.status === 'awaiting_signature' ||
    state.status === 'verifying'

  // Esc closes the modal — but never mid-connection (the wallet modal owns focus then).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !connecting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [connecting, onClose])

  const selected = ISSUE_CARDS.find((c) => c.id === selectedId) ?? ISSUE_CARDS[0]
  const canDismiss = !connecting

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Issue your AuraCard"
      onClick={() => canDismiss && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-center">
          {step !== 'card' && (
            <button
              type="button"
              onClick={() => setStep(step === 'connect' ? 'review' : 'card')}
              aria-label="Back"
              disabled={connecting}
              className="absolute left-5 top-6 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {step === 'card' ? 'Issue Card' : step === 'review' ? 'Review' : 'Connect Wallet'}
          </h2>
          {canDismiss && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-5 top-6 rounded-full border border-border p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {step === 'card' && (
          <CardSelectStep
            selectedId={selectedId}
            onSelect={setSelectedId}
            onContinue={() => setStep('review')}
          />
        )}
        {step === 'review' && (
          <ReviewStep card={selected} onActivate={() => setStep('connect')} />
        )}
        {step === 'connect' && (
          <ConnectWalletStep
            connecting={connecting}
            errorCode={state.status === 'error' ? state.error : undefined}
            onContinue={() => void start('walletconnect', '/dashboard')}
          />
        )}
      </div>
    </div>
  )
}

function CardSelectStep({
  selectedId,
  onSelect,
  onContinue,
}: {
  selectedId: IssueCardId
  onSelect: (id: IssueCardId) => void
  onContinue: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">Select the card that suits your style.</p>
      <div className="flex flex-col gap-3">
        {ISSUE_CARDS.map((card) => {
          const active = card.id === selectedId
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.id)}
              aria-pressed={active}
              className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                active ? 'border-primary bg-primary/5' : 'border-border bg-secondary/40 hover:bg-secondary'
              }`}
            >
              <CardThumb id={card.id} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-foreground">{card.name}</span>
                  {card.requirement && (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                      {card.requirement}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{card.blurb}</p>
              </div>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                }`}
              >
                {active && <Check className="h-4 w-4" />}
              </span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5"
      >
        Continue<ArrowRight className="h-5 w-5" />
      </button>
    </div>
  )
}

function ReviewStep({ card, onActivate }: { card: IssueCardOption; onActivate: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-lg font-bold text-foreground">Ready to issue.</span>
        </div>
        <p className="text-sm text-muted-foreground">Review your card before issuance.</p>
      </div>

      <div className="rounded-2xl bg-secondary/50 p-4">
        <Row label="Card" value={card.name} />
        <Row label="Cashback" value={card.cashback} />
        <Row label="Annual Fee" value={card.annualFee} valueClassName="text-success font-semibold" />
      </div>

      <div>
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Included perks
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {card.perks.map((perk) => (
            <div
              key={perk}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm font-medium text-foreground"
            >
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onActivate}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5"
      >
        Activate your card<ArrowRight className="h-5 w-5" />
      </button>
    </div>
  )
}

function ConnectWalletStep({
  connecting,
  errorCode,
  onContinue,
}: {
  connecting: boolean
  errorCode?: SiweLoginError
  onContinue: () => void
}) {
  const steps = ['Connect Wallet', 'Choose Network', 'Issue Card']
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
        {steps.map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-2.5 py-1 ${
              i === 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Wallet className="h-9 w-9" />
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Wifi className="h-4 w-4" />
          </span>
        </div>
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          Connect your crypto wallet to proceed with card issuance.
        </p>
      </div>

      {errorCode && (
        <p className="text-center text-sm text-red-500" role="alert">
          {CONNECT_ERROR[errorCode]}
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={connecting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {connecting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />Connecting…
          </>
        ) : (
          'Continue'
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">Your wallet will be linked to the card.</p>
    </div>
  )
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClassName ?? 'font-semibold text-foreground'}>{value}</span>
    </div>
  )
}

function CardThumb({ id }: { id: IssueCardId }) {
  return (
    <div
      className={`flex h-9 w-14 shrink-0 flex-col justify-between rounded-md p-1.5 ${CARD_THUMB[id]}`}
      aria-hidden
    >
      <span className="text-[6px] font-bold uppercase tracking-wider">Aura</span>
      <span className="h-1.5 w-4 rounded-sm bg-current opacity-40" />
    </div>
  )
}
