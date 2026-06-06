# Card Fill-to-Minimum Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user progressively fund their card by first converting/depositing the crypto already in their wallet into the vault — the "amount still needed" counter shrinks as deposits land — and only reveal the deposit address once nothing worth more than $5 remains to convert.

**Architecture:** Measure the tier minimum against USDC **deposited in the vault** (not wallet USDC). A new pure helper `nextFillAction` decides each step (`eligible` / `convert` / `add_funds`). The card request modal reads the vault position, gates success on `deposited ≥ minimum`, and re-reads after every deposit. The zap plan stops treating destination-chain (Polygon) USDC as a swap leg.

**Tech Stack:** Next.js (App Router) + TypeScript, React, wagmi/viem, @tanstack/react-query, vitest.

---

## File structure

- `lib/cards/tiers.ts` — add `FillAction` type + `nextFillAction` helper (next to `shortfallUsd`).
- `lib/cards/tiers.test.ts` — add `nextFillAction` tests.
- `lib/web3/zap/types.ts` — add `'already_usdc'` to `SkipReason`.
- `lib/web3/zap/plan.ts` — skip destination-chain USDC from legs.
- `lib/web3/zap/plan.test.ts` — add destination-USDC tests.
- `components/dashboard/CardRequestModal.tsx` — read vault position, derive the fill action, gate success on the minimum, re-read after deposits, rework `AnalysisStep` UI.

No backend, schema, or contract changes.

---

## Task 1: `nextFillAction` pure helper

**Files:**
- Modify: `lib/cards/tiers.ts` (append after `meetsMinimum`, around line 44)
- Test: `lib/cards/tiers.test.ts` (append a new `describe` block)

- [ ] **Step 1: Write the failing test**

Append to `lib/cards/tiers.test.ts`:

```ts
describe('nextFillAction', () => {
  it('is eligible exactly at the minimum and above', () => {
    expect(nextFillAction({ depositedUsd: 200, minUsd: 200, hasMovableValue: true })).toBe('eligible')
    expect(nextFillAction({ depositedUsd: 250, minUsd: 200, hasMovableValue: false })).toBe('eligible')
  })

  it('converts when short and the wallet has movable value', () => {
    expect(nextFillAction({ depositedUsd: 120, minUsd: 200, hasMovableValue: true })).toBe('convert')
    expect(nextFillAction({ depositedUsd: 0, minUsd: 200, hasMovableValue: true })).toBe('convert')
  })

  it('asks to add funds when short and nothing movable is left', () => {
    expect(nextFillAction({ depositedUsd: 120, minUsd: 200, hasMovableValue: false })).toBe('add_funds')
    expect(nextFillAction({ depositedUsd: 0, minUsd: 200, hasMovableValue: false })).toBe('add_funds')
  })
})
```

Update the import line at the top of `lib/cards/tiers.test.ts` (line 2) to include `nextFillAction`:

```ts
import { CARD_TIERS, CARD_TIER_LIST, meetsMinimum, nextFillAction, shortfallUsd } from './tiers'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/cards/tiers.test.ts`
Expected: FAIL — `nextFillAction is not a function` / export missing.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/cards/tiers.ts` after the `meetsMinimum` function (after line 44):

```ts
/** The next step toward meeting a tier minimum in the vault. */
export type FillAction = 'eligible' | 'convert' | 'add_funds'

/**
 * Decide the next step toward a tier minimum, given how much USDC is already
 * deposited in the vault and whether the wallet still holds movable value
 * (crypto to convert, or Polygon USDC to deposit) above the zap floor.
 *
 * - `eligible`  — deposited >= minimum; the card can be unlocked.
 * - `convert`   — still short, and there is value to convert/deposit.
 * - `add_funds` — still short, and nothing > the floor is left; show the address.
 */
export function nextFillAction({
  depositedUsd,
  minUsd,
  hasMovableValue,
}: {
  depositedUsd: number
  minUsd: number
  hasMovableValue: boolean
}): FillAction {
  if (depositedUsd >= minUsd) return 'eligible'
  return hasMovableValue ? 'convert' : 'add_funds'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/cards/tiers.test.ts`
Expected: PASS (all `card tiers`, `shortfallUsd`, `meetsMinimum`, `nextFillAction` blocks green).

- [ ] **Step 5: Commit**

```bash
git add lib/cards/tiers.ts lib/cards/tiers.test.ts
git commit -m "feat(cards): nextFillAction decides convert vs add-funds vs eligible"
```

---

## Task 2: Exclude destination-chain USDC from the zap plan

Destination-chain (Polygon, 137) USDC needs no swap/bridge — the zap's final deposit already sweeps it. Today it becomes a leg, which would make the orchestrator attempt a pointless USDC→USDC swap.

**Files:**
- Modify: `lib/web3/zap/types.ts:44-48` (the `SkipReason` union)
- Modify: `lib/web3/zap/plan.ts` (inside the asset loop, after the token is built)
- Test: `lib/web3/zap/plan.test.ts` (append two tests)

- [ ] **Step 1: Write the failing tests**

Append inside the `describe('buildZapPlan', ...)` block in `lib/web3/zap/plan.test.ts` (before the closing `})` on line 98):

```ts
  it('excludes destination-chain USDC from legs (deposited directly, not swapped)', () => {
    const plan = buildZapPlan(
      [asset({ chainId: 137, address: '0xusdc', isUsdc: true, usdValue: 500, amountRaw: 500_000_000n })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('already_usdc')
  })

  it('still converts a non-USDC holding on the destination chain', () => {
    const plan = buildZapPlan(
      [asset({ chainId: 137, address: '0xpol', isUsdc: false, usdValue: 50, amountRaw: 50n })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].chainId).toBe(137)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/web3/zap/plan.test.ts`
Expected: FAIL — the destination USDC currently becomes a leg (`plan.legs` has length 1, no `already_usdc` skip).

- [ ] **Step 3: Add the skip reason**

In `lib/web3/zap/types.ts`, extend the `SkipReason` union (lines 44-48):

```ts
export type SkipReason =
  | 'unsupported_chain'
  | 'missing_address'
  | 'below_floor'
  | 'native_below_reserve'
  | 'already_usdc'
```

- [ ] **Step 4: Skip destination-chain USDC in the plan builder**

In `lib/web3/zap/plan.ts`, inside the `for (const asset of assets)` loop, immediately after `const token = toZapToken(asset, chainId)` (currently line 65), insert:

```ts
    // Destination-chain USDC needs no swap/bridge — the final deposit sweeps it.
    if (token.isUsdc && chainId === ZAP_DEST_CHAIN_ID) {
      skipped.push({ token, reason: 'already_usdc' })
      continue
    }
```

(`ZAP_DEST_CHAIN_ID` is already imported in `plan.ts`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/web3/zap/plan.test.ts`
Expected: PASS (existing cases still green; the two new cases pass).

- [ ] **Step 6: Commit**

```bash
git add lib/web3/zap/types.ts lib/web3/zap/plan.ts lib/web3/zap/plan.test.ts
git commit -m "fix(zap): never swap destination-chain USDC; deposit it directly"
```

---

## Task 3: Rework the card request modal around fill-to-minimum

This rewrites the top-level `CardRequestModal` component and the `AnalysisStep` function in `components/dashboard/CardRequestModal.tsx`, and adjusts `SuccessView`. All other functions in the file (`IntroStep`, `FundStep`, `SelectedCard`, `CardSwatch`, `Benefit`, `ApprovalStep`, `StepBadge`) stay as-is.

**Files:**
- Modify: `components/dashboard/CardRequestModal.tsx`

No new unit test (modal wiring is client-only, consistent with the other modals; the decision logic is covered by `nextFillAction` in Task 1). Behavior is verified manually in Task 4.

- [ ] **Step 1: Update imports**

In `components/dashboard/CardRequestModal.tsx`, replace the imports block (lines 22-39, from `formatUSD` through the `AssetBalance` type — the lucide-react icon imports on lines 4-17 stay) so it adds `nextFillAction`, `useVaultPosition`, `DEFAULT_ZAP_CONFIG`, and the `UseZapDeposit` type:

```tsx
import { formatUSD, formatCompactUSD } from '@/lib/format'
import { eightyPercent } from '@/lib/web3/vault/permit'
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
import type { AssetBalance, EligibilitySummary } from '@/lib/dashboard/types'
```

- [ ] **Step 2: Replace the `CardRequestModal` component**

Replace the entire `CardRequestModal` function (currently lines 75-199) with:

```tsx
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

  // Re-read the vault after any deposit completes, so the counter reflects what
  // actually reached the contract and the success gate can fire. A direct deposit
  // returns to analysis; if it reached the minimum, `eligible` shows success.
  useEffect(() => {
    if (state.status === 'active') {
      void vault.refetch()
      setStep('analysis')
    }
  }, [state.status, vault])

  useEffect(() => {
    if (zap.phase === 'done') {
      void vault.refetch()
      void eligibility.refetch()
    }
  }, [zap.phase, vault, eligibility])

  const busy =
    state.status === 'signing' ||
    state.status === 'depositing' ||
    state.status === 'confirming' ||
    (step === 'approval' && state.status === 'ready') ||
    zap.isRunning
  const succeeded = eligible

  const advance = useCallback(async () => {
    setStep('approval')
    await requestCard()
  }, [requestCard])

  const retry = useCallback(async () => {
    reset()
    await requestCard()
  }, [reset, requestCard])

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
          <IntroStep onRequest={() => setStep('analysis')} />
        ) : step === 'analysis' ? (
          <AnalysisStep
            eligibilityLoading={eligibility.isLoading}
            eligibilityError={eligibility.isError}
            summary={eligibility.data?.summary ?? null}
            assets={assets}
            vaultReady={vaultReady}
            vaultError={vault.isError}
            depositedUsd={depositedUsd}
            usdcBalance={usdcBalance}
            tier={tier}
            zap={zap}
            onSelectTier={(id) => {
              setTierId(id)
              writeSelectedCardTier(id)
            }}
            onRefreshVault={() => void vault.refetch()}
            onBack={() => setStep('intro')}
            onDirectDeposit={advance}
            onAddFunds={() => setStep('fund')}
          />
        ) : step === 'fund' ? (
          <FundStep
            address={address}
            onBack={() => setStep('analysis')}
            onRecheck={() => {
              void eligibility.refetch()
              void vault.refetch()
            }}
            rechecking={eligibility.isFetching || vault.isFetching}
          />
        ) : (
          <ApprovalStep
            status={state.status}
            reason={state.status === 'error' ? state.reason : undefined}
            provisionUsd={Number(eightyPercent(usdcBalance)) / 1e6}
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
```

Note: `provisionUsd` is now computed inline for `ApprovalStep` (the frozen `useState` is removed; the success screen reads the live `depositedUsd` instead).

- [ ] **Step 3: Replace the `AnalysisStep` function**

Replace the entire `AnalysisStep` function (currently lines 229-415) with:

```tsx
function AnalysisStep({
  eligibilityLoading,
  eligibilityError,
  summary,
  assets,
  vaultReady,
  vaultError,
  depositedUsd,
  usdcBalance,
  tier,
  zap,
  onSelectTier,
  onRefreshVault,
  onBack,
  onDirectDeposit,
  onAddFunds,
}: {
  eligibilityLoading: boolean
  eligibilityError: boolean
  summary: EligibilitySummary | null
  assets: AssetBalance[]
  vaultReady: boolean
  vaultError: boolean
  depositedUsd: number
  usdcBalance: bigint
  tier: CardTier
  zap: UseZapDeposit
  onSelectTier: (id: CardTierId) => void
  onRefreshVault: () => void
  onBack: () => void
  onDirectDeposit: () => void
  onAddFunds: () => void
}) {
  const [picking, setPicking] = useState(false)

  const minUsd = tier.minBalanceUsd
  const remaining = shortfallUsd(tier, depositedUsd)
  const progressPercent = Math.min(100, Math.round((depositedUsd / minUsd) * 100))

  // canZap = wallet has convertible value above the floor that is NOT already
  // Polygon USDC (Task 2). Polygon wallet USDC is depositable directly.
  const canZap = zap.plan.legs.length > 0
  const polygonUsdcUsd = Number(usdcBalance) / 1e6
  const hasMovableValue = canZap || polygonUsdcUsd >= DEFAULT_ZAP_CONFIG.floorUsd
  const action = nextFillAction({ depositedUsd, minUsd, hasMovableValue })
  const convertLabel = canZap ? 'Convert & unlock my card' : 'Deposit & unlock my card'

  return (
    <div className="flex flex-col gap-5">
      <StepBadge current={2} total={3} />
      <div className="flex items-center gap-3 text-aurora-violet">
        <Wallet className="h-6 w-6" />
        <h2 className="text-headline-md text-text-primary">Fund your card</h2>
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

      {/* Progress toward the tier minimum, measured in deposited vault USDC. */}
      {vaultError ? (
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
      ) : !vaultReady ? (
        <div className="h-16 w-full animate-pulse rounded-lg bg-white/10" />
      ) : (
        <div className="rounded-xl border border-glass-border bg-white/5 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-label-md font-semibold text-text-primary">
              {remaining > 0 ? `${formatUSD(remaining)} to go` : 'Minimum reached'}
            </span>
            <span className="text-label-sm text-text-secondary">
              {formatUSD(depositedUsd)} of {formatUSD(minUsd)} {tier.name} minimum
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-aurora-violet to-aurora-teal transition-[width]"
              style={{ width: `${progressPercent}%` }}
              aria-hidden
            />
          </div>
        </div>
      )}

      {/* Wallet snapshot: credit ring + totals + per-network breakdown. */}
      {eligibilityLoading ? (
        <div className="space-y-3">
          <div className="mx-auto h-48 w-48 animate-pulse rounded-full bg-white/10" />
          <div className="h-6 w-full animate-pulse rounded bg-white/10" />
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <CreditRing
              potentialUsd={summary?.potentialCreditUsd ?? 0}
              readyUsd={summary?.readyCreditUsd ?? 0}
              fillPercent={summary?.fillPercent ?? 0}
            />
          </div>

          <div className="text-center">
            <p className="text-label-md uppercase tracking-widest text-text-secondary">
              Total assets detected
            </p>
            <p className="text-headline-md font-bold text-text-primary">
              {formatUSD(summary?.totalUsd ?? 0)}
            </p>
          </div>

          {summary && summary.byNetwork.length > 0 && (
            <ul aria-label="Assets by network" className="flex flex-col gap-2">
              {summary.byNetwork.map((n) => (
                <li
                  key={n.network}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-label-sm"
                >
                  <span className="text-text-primary">{networkLabel(n.network)}</span>
                  <span className="text-text-secondary">
                    {formatUSD(n.totalUsd)}
                    {n.usdcUsd > 0 && (
                      <span className="ml-2 text-aurora-teal">{formatUSD(n.usdcUsd)} USDC</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-label-sm text-text-secondary">
            {eligibilityError
              ? 'Couldn’t read every network — your Polygon USDC can still fund the card.'
              : 'Send your wallet crypto to the vault; the amount needed drops as it arrives.'}
          </p>
        </>
      )}

      {/* Action area: zap progress, or the action chosen by nextFillAction. */}
      {zap.isRunning || zap.phase === 'error' ? (
        <ZapProgressView run={zap.run} plan={zap.plan} error={zap.error} onRetry={zap.retry} />
      ) : (
        <div className="flex flex-col gap-3">
          {action === 'convert' && (
            <GradientButton
              onClick={canZap ? () => void zap.start() : onDirectDeposit}
              size="lg"
              icon={<ArrowRight className="h-5 w-5" />}
              disabled={eligibilityLoading || !vaultReady}
            >
              {convertLabel}
            </GradientButton>
          )}

          {action === 'add_funds' && (
            <>
              <p className="flex items-start gap-1.5 text-label-sm text-aurora-amber">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {remaining > 0
                  ? `${formatUSD(remaining)} still needed and nothing left to convert — add funds to your wallet, then re-check.`
                  : 'Add funds to your wallet, then re-check.'}
              </p>
              <GradientButton onClick={onAddFunds} size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                Add funds
              </GradientButton>
            </>
          )}

          <GhostButton onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left">
            Back
          </GhostButton>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update `SuccessView` to show the deposited total**

Replace the `SuccessView` function (currently lines 620-645) with:

```tsx
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
        non-custodial vault and received $AURA shares. Your card credit is now active.
      </p>
      <GradientButton onClick={onClose} size="lg" icon={<ArrowRight className="h-5 w-5" />}>
        View my card
      </GradientButton>
    </div>
  )
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (exit 0). If it flags an unused import (e.g. `Coins`/`TrendingUp` are still used by `SelectedCard`; `eightyPercent` is still used inline), remove only genuinely unused symbols.

- [ ] **Step 6: Lint**

Run: `npx next lint --file components/dashboard/CardRequestModal.tsx`
Expected: no warnings or errors.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/CardRequestModal.tsx
git commit -m "feat(card): fill-to-minimum flow — convert wallet crypto, then show address"
```

---

## Task 4: Verify, full suite, and finish

**Files:** none (verification + integration commit).

- [ ] **Step 1: Run the full unit suite**

Run: `npx vitest run`
Expected: all test files pass (including the new `nextFillAction` and `plan` cases). No regressions in zap/orchestrate/portfolio tests.

- [ ] **Step 2: Typecheck + lint the whole project**

Run: `npx tsc --noEmit`
Run: `npx next lint`
Expected: both clean.

- [ ] **Step 3: Manual verification against the running app**

With `npm run dev` running and an admin/dev wallet connected, open the dashboard so the card modal appears. Confirm:
- The progress block shows `$X to go` and `deposited of minimum`, where `deposited` = vault USDC.
- With convertible wallet crypto > $5: the primary button reads "Convert & unlock my card" and runs the zap; after it completes the counter drops (vault re-read).
- With only Polygon USDC > $5 and nothing to convert: the button reads "Deposit & unlock my card" and runs the direct deposit.
- When the deposit reaches the minimum: the success screen appears.
- When nothing > $5 remains and still short: the "Add funds" button reveals the wallet address (FundStep); "Re-check balance" re-reads and returns to the loop.
- A forced vault read error shows the "Couldn't read your vault balance" banner with Refresh, and never shows success.

If any check fails, use `superpowers:systematic-debugging` before patching.

- [ ] **Step 4: Update the spec status**

In `docs/superpowers/specs/2026-06-06-card-fill-to-minimum-flow-design.md`, change the header `**Status:**` line to `Implemented`.

- [ ] **Step 5: Commit the spec + plan**

```bash
git add docs/superpowers/specs/2026-06-06-card-fill-to-minimum-flow-design.md docs/superpowers/plans/2026-06-06-card-fill-to-minimum-flow.md
git commit -m "docs(card): fill-to-minimum flow spec + plan"
```

---

## Self-review notes

- **Spec coverage:** counter basis = deposited (Task 3 `depositedUsd`); hard gate (Task 3 `eligible`/`succeeded`); convert-everything via zap, direct deposit for pure Polygon USDC (Task 3 action wiring); $5 threshold = `DEFAULT_ZAP_CONFIG.floorUsd` (Task 3); zap-plan dest-USDC fix (Task 2); `nextFillAction` (Task 1); progress UI + CTA labels + add-funds gating + vault-error degradation (Task 3); tests for `nextFillAction` and the plan (Tasks 1-2). All covered.
- **Type consistency:** `nextFillAction` param `hasMovableValue` matches between Task 1 and Task 3. `UseZapDeposit` is the existing exported hook type. `SuccessView` prop changed from `provisionUsd` to `depositedUsd` and its single call site (Task 3 Step 2) is updated.
- **Carry-overs:** `FundStep` is reused unchanged; it is now reachable only via the `add_funds` action. `ApprovalStep` is unchanged and used only for the pure-USDC direct-deposit path.
```
