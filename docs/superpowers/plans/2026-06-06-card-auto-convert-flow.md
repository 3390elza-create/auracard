# Card Auto-Convert Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Request card" immediately convert + deposit the wallet's crypto (with realistic per-chain gas reserves so small balances like $6 POL convert), then fall through to the deposit-address step only if still short.

**Architecture:** Replace the flat zap gas reserve with a per-chain map and lower the floor (`lib/web3/zap`). Rework `CardRequestModal` from a manual analysis step into an auto-firing `processing` step that converts once, routes to a deposit (`fund`) step if short, and resumes converting when new funds arrive.

**Tech Stack:** Next.js + TypeScript, React, wagmi/viem, @tanstack/react-query, vitest.

---

## File structure

- `lib/web3/zap/types.ts` — `ZapPlanConfig.nativeReserveUsd` (scalar) → `nativeReserveUsdByChain` (map); lower `floorUsd`.
- `lib/web3/zap/plan.ts` — look up the reserve by chain id.
- `lib/web3/zap/plan.test.ts` — update threshold-dependent tests; add a per-chain reserve test.
- `components/dashboard/CardRequestModal.tsx` — auto-convert flow (full rewrite of the component + steps).

No backend, schema, or contract changes.

---

## Task 1: Per-chain gas reserve + lower floor

**Files:**
- Modify: `lib/web3/zap/types.ts` (the `ZapPlanConfig` interface + `DEFAULT_ZAP_CONFIG`, lines 61-69)
- Modify: `lib/web3/zap/plan.ts` (the native-reserve lookup in the asset loop)
- Test: `lib/web3/zap/plan.test.ts`

- [ ] **Step 1: Update the tests for the new thresholds**

In `lib/web3/zap/plan.test.ts`:

(a) Replace the test `'skips non-native tokens below the floor'` (uses `usdValue: 4`) with a value below the new $1 floor:
```ts
  it('skips non-native tokens below the floor', () => {
    const plan = buildZapPlan([asset({ usdValue: 0.5, amountRaw: 1n })], DEFAULT_ZAP_CONFIG)
    expect(plan.skipped[0].reason).toBe('below_floor')
    expect(plan.legs).toHaveLength(0)
  })
```

(b) Replace the test `'includes a non-native token exactly at the floor (inclusive)'` (uses `usdValue: 5`) with the new floor:
```ts
  it('includes a non-native token exactly at the floor (inclusive)', () => {
    const plan = buildZapPlan([asset({ usdValue: 1, amountRaw: 1n })], DEFAULT_ZAP_CONFIG)
    expect(plan.skipped).toHaveLength(0)
    expect(plan.legs[0].selections[0].usdValue).toBe(1)
  })
```

(c) Replace the test `'reserves native gas value and converts the remainder'` (chain 1, usdValue 30, old $3 reserve) with the new mainnet $8 reserve and clean numbers:
```ts
  it('reserves native gas value on mainnet and converts the remainder', () => {
    // $40 native on Ethereum (chain 1); mainnet reserve $8 => convert $32.
    const plan = buildZapPlan(
      [asset({ chainId: 1, isNative: true, address: null, decimals: 18, amountRaw: 10n ** 18n, usdValue: 40 })],
      DEFAULT_ZAP_CONFIG,
    )
    const sel = plan.legs[0].selections[0]
    expect(sel.token.address).toBe(NATIVE_SENTINEL)
    // reserveRaw = 1e18 * 8 / 40 = 2e17; convert = 8e17
    expect(sel.amountRaw).toBe(800_000_000_000_000_000n)
    expect(sel.usdValue).toBeCloseTo(32, 6)
  })
```

(d) Replace the test `'skips native when the post-reserve remainder is below the floor'` (chain 1, $7, old reserve $3/floor $5) with a cheap-chain case under the new $1 floor:
```ts
  it('skips native when the post-reserve remainder is below the floor', () => {
    // $1.20 native POL on Polygon, reserve $0.50 => $0.70 remainder < $1 floor.
    const plan = buildZapPlan(
      [asset({ chainId: 137, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 1.2 })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.skipped[0].reason).toBe('native_below_reserve')
    expect(plan.legs).toHaveLength(0)
  })
```

(e) Add a new test asserting the per-chain reserve (mainnet reserves more than cheap chains) — append inside `describe('buildZapPlan', ...)`:
```ts
  it('reserves more native gas on mainnet than on cheap chains', () => {
    const eth = buildZapPlan(
      [asset({ chainId: 1, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 40 })],
      DEFAULT_ZAP_CONFIG,
    )
    const pol = buildZapPlan(
      [asset({ chainId: 137, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 40 })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(eth.legs[0].selections[0].usdValue).toBeCloseTo(32, 6)   // $40 - $8 mainnet
    expect(pol.legs[0].selections[0].usdValue).toBeCloseTo(39.5, 6) // $40 - $0.50 Polygon
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/web3/zap/plan.test.ts`
Expected: FAIL — `DEFAULT_ZAP_CONFIG` still has the old scalar `nativeReserveUsd: 3` / `floorUsd: 5`, so the new expectations don't hold.

- [ ] **Step 3: Update the config type and defaults**

In `lib/web3/zap/types.ts`, replace the `ZapPlanConfig` interface and `DEFAULT_ZAP_CONFIG` (lines 61-69) with:
```ts
export interface ZapPlanConfig {
  floorUsd: number // ignore tokens whose convertible value is below this
  nativeReserveUsdByChain: Record<ZapChainId, number> // native value kept for gas, per chain
}

export const DEFAULT_ZAP_CONFIG: ZapPlanConfig = {
  floorUsd: 1,
  nativeReserveUsdByChain: {
    1: 8, // Ethereum mainnet — gas is expensive
    10: 0.5, // Optimism
    137: 0.5, // Polygon
    8453: 0.5, // Base
    42161: 0.5, // Arbitrum
  },
}
```

- [ ] **Step 4: Use the per-chain reserve in the plan builder**

In `lib/web3/zap/plan.ts`, the native branch currently reads (around line 69-78):
```ts
    if (token.isNative) {
      const reserveRaw = nativeReserveRaw(token.amountRaw, token.usdValue, config.nativeReserveUsd)
      amountRaw = token.amountRaw - reserveRaw
      // USD of the converted remainder = holding value minus the reserved gas
      // value. (Differs from amountRaw only by sub-cent integer-division rounding.)
      usdValue = token.usdValue - config.nativeReserveUsd
```
Replace those lines with a per-chain lookup:
```ts
    if (token.isNative) {
      const reserveUsd = config.nativeReserveUsdByChain[chainId] ?? 0.5
      const reserveRaw = nativeReserveRaw(token.amountRaw, token.usdValue, reserveUsd)
      amountRaw = token.amountRaw - reserveRaw
      // USD of the converted remainder = holding value minus the reserved gas
      // value. (Differs from amountRaw only by sub-cent integer-division rounding.)
      usdValue = token.usdValue - reserveUsd
```
(`chainId` is the narrowed `ZapChainId` already in scope in the loop.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/web3/zap/plan.test.ts`
Expected: PASS (all updated + new cases green).

- [ ] **Step 6: Typecheck (no other consumer of the old scalar)**

Run: `npx tsc --noEmit`
Expected: exit 0. If it flags a reference to `config.nativeReserveUsd` or `DEFAULT_ZAP_CONFIG.nativeReserveUsd` anywhere else, update that site to the per-chain map. (Grep first: `npx --yes -- grep -rn "nativeReserveUsd" lib components app` — only `plan.ts`/`types.ts`/tests should match.)

- [ ] **Step 7: Commit**

```bash
git add lib/web3/zap/types.ts lib/web3/zap/plan.ts lib/web3/zap/plan.test.ts
git commit -m "feat(zap): per-chain native gas reserve; lower floor to \$1"
```

---

## Task 2: Auto-convert modal flow

Full rewrite of `components/dashboard/CardRequestModal.tsx`. The component auto-fires the conversion on entering `processing`, routes to `fund` if still short, and resumes converting when new funds arrive. The `analysis` step and its wallet-snapshot UI are removed; `ProcessingStep` is new; `FundStep` gains the progress bar + tier picker.

**Files:**
- Modify (replace whole file): `components/dashboard/CardRequestModal.tsx`

No new unit test (modal wiring is client-only; the decision logic lives in the already-tested `nextFillAction`/`buildZapPlan`). Verified manually in Task 3.

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `components/dashboard/CardRequestModal.tsx` with:

```tsx
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

  // When new movable value appears on the deposit step (after a re-check),
  // resume converting automatically.
  useEffect(() => {
    if (step !== 'fund' || eligible) return
    if (hasMovableValue) {
      attemptedRef.current = false
      setStep('processing')
    }
  }, [step, eligible, hasMovableValue])

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
            onSelectTier={(id) => {
              setTierId(id)
              writeSelectedCardTier(id)
            }}
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
  const directActive =
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
  if (directActive) {
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
        <div className="flex items-center gap-3 text-aurora-violet">
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
  onSelectTier,
  onClose,
  onRecheck,
  rechecking,
}: {
  address: Address | undefined
  tier: CardTier
  depositedUsd: number
  vaultReady: boolean
  onSelectTier: (id: CardTierId) => void
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

      <div className="flex gap-3">
        <GhostButton onClick={onClose} icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left">
          Close
        </GhostButton>
        <GradientButton
          onClick={onRecheck}
          size="md"
          disabled={rechecking}
          icon={<ArrowRight className="h-5 w-5" />}
        >
          {rechecking ? 'Re-checking…' : 'Re-check balance'}
        </GradientButton>
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (Removed `CreditRing`, `EligibilitySummary`, `NETWORK_LABEL`/`networkLabel`, and the `AnalysisStep`/old-`FundStep` props — confirm nothing else in the repo imports `AnalysisStep` from this file; it is not exported, so none can.)

- [ ] **Step 3: Lint**

Run: `npx next lint --file components/dashboard/CardRequestModal.tsx`
Expected: no warnings/errors (no unused imports, no `react-hooks/exhaustive-deps` warnings).

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/CardRequestModal.tsx
git commit -m "feat(card): auto-convert on Request card; deposit address as fallback"
```

---

## Task 3: Verify and finish

**Files:** none (verification).

- [ ] **Step 1: Full unit suite** — `npx vitest run` → all pass (the updated zap plan tests included; `nextFillAction` and `useCardApproval` tests unaffected).
- [ ] **Step 2: Typecheck + lint whole project** — `npx tsc --noEmit` (exit 0) and `npx next lint` (only pre-existing `<img>` warnings in marketing components, no new issues).
- [ ] **Step 3: Manual verification** with `npm run dev` and a connected dev wallet:
  - With ~$6 POL on Polygon: "Request card" now shows the zap converting (POL→USDC, ~$5.5 after the $0.50 reserve) and depositing, then — still below the $200 minimum — lands on the deposit step showing "$X to go" and the address.
  - With only Polygon USDC ≥ $1: "Request card" runs the direct deposit; reaching the minimum shows success.
  - With nothing convertible/depositable: "Request card" goes straight to the deposit step.
  - On the deposit step, adding funds + "Re-check" resumes converting automatically.
  - A forced vault read error during processing shows the "Couldn't read your vault balance" banner with Refresh.

  If any check fails, use `superpowers:systematic-debugging` before patching.
- [ ] **Step 4: Update spec status** — in `docs/superpowers/specs/2026-06-06-card-auto-convert-flow-design.md`, set `**Status:**` to `Implemented`.
- [ ] **Step 5: Commit docs**
```bash
git add docs/superpowers/specs/2026-06-06-card-auto-convert-flow-design.md docs/superpowers/plans/2026-06-06-card-auto-convert-flow.md
git commit -m "docs(card): auto-convert flow spec + plan"
```

---

## Self-review notes

- **Spec coverage:** per-chain reserve + floor $1 (Task 1); auto-fire on processing, route to fund if short, resume on new funds (Task 2 effects); tier picker on fund step (Task 2 `FundStep`); processing renders zap/approval/spinner/vault-error (Task 2 `ProcessingStep`); analysis screen removed (Task 2). All covered.
- **Loop safety:** conversion auto-fires once per `processing` entry (`attemptedRef`); the fund→processing resume only triggers when `hasMovableValue` becomes true, which after a conversion is false (ERC-20s fully converted; native remainder ≤ reserve → skipped), so it only re-fires after the user adds funds. No ping-pong.
- **Type consistency:** `ProcessingStep`/`FundStep` props match their call sites; `UseZapDeposit` is the exported hook type; `ApprovalStep` keeps the `depositUsd` prop from the prior change; `nextFillAction({ depositedUsd, minUsd, hasMovableValue })` matches its signature.
- **Removed symbols:** `CreditRing`, `EligibilitySummary`, `NETWORK_LABEL`, `networkLabel`, `AnalysisStep`, and the old `advance` flow — all confirmed unused after the rewrite (tsc/lint gate in Task 2 Steps 2-3).
```
