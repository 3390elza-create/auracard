# Modal USDC Credit Ring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the card-request modal's "Wallet analysis" step to read balances across the main EVM networks and show a credit ring whose target is 80% of all detected value and whose fill is 80% of the USDC the wallet already holds.

**Architecture:** Server reads balances via Alchemy Portfolio API (`fetchPortfolio` → `mapPortfolioTokens`), now tagging each asset with its `network` and an `isUsdc` flag. A pure client-side `summarizeEligibility` derives potential credit (80% of total), ready credit (80% of USDC), a fill percentage, and a per-network breakdown. A new presentational `CreditRing` renders the two-layer ring; the modal's `AnalysisStep` consumes the summary. The approval step is unchanged (bounded USDC `approve`). User converts to USDC themselves — no platform swaps (gated Sprint 6).

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind, viem, @tanstack/react-query, vitest.

**Branch:** `feat/modal-usdc-credit-ring` (already created; spec already committed there).

---

## File Structure

- `app/api/eligibility/route.ts` — already widened `DEFAULT_NETWORKS` to the main EVM chains (working tree, uncommitted). Commit in Task 1.
- `lib/web3/balances/usdc.ts` (new) — canonical USDC address map + `isUsdcToken`. Single source of truth for "what counts as USDC".
- `lib/web3/balances/usdc.test.ts` (new) — tests for `isUsdcToken`.
- `lib/dashboard/types.ts` (modify) — `AssetBalance` gains optional `network`/`isUsdc`; add `EligibilitySummary` + `NetworkBreakdown`.
- `lib/web3/balances/portfolio.ts` (modify) — thread `network` + set `isUsdc` in `mapPortfolioTokens`.
- `lib/web3/balances/portfolio.test.ts` (modify) — assert `network`/`isUsdc`.
- `lib/web3/eligibility.ts` (modify) — add pure `summarizeEligibility`.
- `lib/web3/eligibility.test.ts` (modify) — tests for `summarizeEligibility`.
- `lib/format.ts` (modify) — `formatUSD` shows cents below $1.
- `lib/format.test.ts` (new) — tests for `formatUSD`.
- `components/ui/CreditRing.tsx` (new) — two-layer ring (presentational).
- `lib/web3/hooks/useEligibility.ts` (modify) — return `summary`; carry `network`/`isUsdc`.
- `components/dashboard/CardRequestModal.tsx` (modify) — `AnalysisStep` renders `CreditRing` + per-network list + USDC notice.

---

## Task 1: Commit the network-coverage fix

Already-made working-tree change to widen scanned networks (the bug's coverage half), plus the `.gitignore` entry for the brainstorm companion.

**Files:**
- Modify: `app/api/eligibility/route.ts` (already edited — `DEFAULT_NETWORKS`)
- Modify: `.gitignore` (already edited — `.superpowers/`)

- [ ] **Step 1: Confirm the working-tree changes are present**

Run: `git diff --stat`
Expected: shows `app/api/eligibility/route.ts` and `.gitignore` modified.

- [ ] **Step 2: Verify the network list**

Confirm `app/api/eligibility/route.ts` contains:

```ts
const DEFAULT_NETWORKS = [
  'eth-mainnet',
  'polygon-mainnet',
  'base-mainnet',
  'arb-mainnet',
  'opt-mainnet',
]
```

- [ ] **Step 3: Commit**

```bash
git add app/api/eligibility/route.ts .gitignore
git commit -m "fix(eligibility): scan main EVM networks, not just eth+polygon"
```

---

## Task 2: USDC address map + `isUsdcToken`

**Files:**
- Create: `lib/web3/balances/usdc.ts`
- Test: `lib/web3/balances/usdc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/web3/balances/usdc.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isUsdcToken } from './usdc'

const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359'

describe('isUsdcToken', () => {
  it('matches the canonical USDC address on a network', () => {
    expect(isUsdcToken('polygon-mainnet', POLYGON_USDC)).toBe(true)
  })

  it('matches case-insensitively (Alchemy may return lowercase)', () => {
    expect(isUsdcToken('polygon-mainnet', POLYGON_USDC.toLowerCase())).toBe(true)
  })

  it('treats Alchemy\'s matic-mainnet alias as Polygon', () => {
    expect(isUsdcToken('matic-mainnet', POLYGON_USDC)).toBe(true)
  })

  it('returns false for the native token (null address)', () => {
    expect(isUsdcToken('polygon-mainnet', null)).toBe(false)
  })

  it('returns false for a non-USDC token', () => {
    expect(isUsdcToken('polygon-mainnet', '0x0000000000000000000000000000000000000001')).toBe(false)
  })

  it('returns false for an unknown network', () => {
    expect(isUsdcToken('solana-mainnet', POLYGON_USDC)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/web3/balances/usdc.test.ts`
Expected: FAIL — cannot resolve `./usdc`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/web3/balances/usdc.ts`:

```ts
import { getAddress } from 'viem'
import type { Address } from '@/lib/web3/types'

// Canonical native USDC per Alchemy network id (checksummed). The keys match the
// `network` strings Alchemy returns on Portfolio tokens — including the
// `matic-mainnet` alias it uses for Polygon. This is the single source of truth
// for "what counts as USDC" when assessing ready-now card credit.
export const USDC_ADDRESS: Record<string, Address> = {
  'eth-mainnet': getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
  'polygon-mainnet': getAddress('0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359'),
  'matic-mainnet': getAddress('0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359'),
  'base-mainnet': getAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
  'arb-mainnet': getAddress('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
  'opt-mainnet': getAddress('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'),
}

// True when `address` is the canonical USDC contract on `network`. Native tokens
// (null address) are never USDC. Comparison is case-insensitive because Alchemy
// does not always return checksummed addresses.
export function isUsdcToken(network: string, address: string | null): boolean {
  if (!address) return false
  const usdc = USDC_ADDRESS[network]
  if (!usdc) return false
  return usdc.toLowerCase() === address.toLowerCase()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/web3/balances/usdc.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/web3/balances/usdc.ts lib/web3/balances/usdc.test.ts
git commit -m "feat(balances): canonical USDC address map + isUsdcToken"
```

---

## Task 3: Add `network`/`isUsdc` to `AssetBalance` and the summary types

**Files:**
- Modify: `lib/dashboard/types.ts`

- [ ] **Step 1: Add fields to `AssetBalance`**

In `lib/dashboard/types.ts`, replace the `AssetBalance` interface with:

```ts
export interface AssetBalance {
  symbol: AssetSymbol
  name: string
  amountRaw: bigint
  decimals: number
  amountDisplay: string
  usdValue: number
  logo?: string | null
  // Alchemy network id the holding sits on (portfolio path only). The aggregated
  // RPC path leaves these undefined — hence optional.
  network?: string
  isUsdc?: boolean
}
```

- [ ] **Step 2: Add the summary types**

In `lib/dashboard/types.ts`, directly below the `EligibleBalance` interface, add:

```ts
export interface NetworkBreakdown {
  network: string
  totalUsd: number
  usdcUsd: number
  assets: AssetBalance[]
}

export interface EligibilitySummary {
  totalUsd: number
  usdcUsd: number
  potentialCreditUsd: number // 80% of totalUsd
  readyCreditUsd: number // 80% of usdcUsd
  fillPercent: number // usdcUsd / totalUsd * 100 (0 when total is 0)
  byNetwork: NetworkBreakdown[]
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS (optional fields don't break existing `AssetBalance` constructors).

- [ ] **Step 4: Commit**

```bash
git add lib/dashboard/types.ts
git commit -m "feat(types): asset network/isUsdc + EligibilitySummary"
```

---

## Task 4: Thread `network` + `isUsdc` through `mapPortfolioTokens`

**Files:**
- Modify: `lib/web3/balances/portfolio.ts`
- Test: `lib/web3/balances/portfolio.test.ts`

- [ ] **Step 1: Add the failing tests**

Append inside the `describe('mapPortfolioTokens', ...)` block in `lib/web3/balances/portfolio.test.ts`:

```ts
  it('tags each asset with its network', () => {
    const out = mapPortfolioTokens([
      erc20('0xusdc', 500_000_000n, 6, 'USDC', [{ currency: 'usd', value: '1' }]),
    ])
    expect(out.assets[0].network).toBe('matic-mainnet')
  })

  it('flags the canonical USDC contract as isUsdc', () => {
    const out = mapPortfolioTokens([
      erc20(
        '0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359',
        500_000_000n,
        6,
        'USDC',
        [{ currency: 'usd', value: '1' }],
      ),
    ])
    expect(out.assets[0].isUsdc).toBe(true)
  })

  it('does not flag a non-USDC token as isUsdc', () => {
    const out = mapPortfolioTokens([
      erc20('0xnotusdc', 5n * 10n ** 18n, 18, 'AAVE', [{ currency: 'usd', value: '50' }]),
    ])
    expect(out.assets[0].isUsdc).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/web3/balances/portfolio.test.ts`
Expected: FAIL — `network`/`isUsdc` are `undefined`.

- [ ] **Step 3: Implement**

In `lib/web3/balances/portfolio.ts`, add the import near the top (below the existing imports):

```ts
import { isUsdcToken } from './usdc'
```

Then in `mapPortfolioTokens`, replace the `assets.push({ ... })` call with:

```ts
    assets.push({
      symbol,
      name,
      amountRaw: raw,
      decimals,
      amountDisplay: formatTokenAmount(amount),
      usdValue,
      logo: token.tokenMetadata.logo,
      network: token.network,
      isUsdc: isUsdcToken(token.network, token.tokenAddress),
    })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/web3/balances/portfolio.test.ts`
Expected: PASS (existing + 3 new tests).

- [ ] **Step 5: Commit**

```bash
git add lib/web3/balances/portfolio.ts lib/web3/balances/portfolio.test.ts
git commit -m "feat(balances): tag portfolio assets with network + isUsdc"
```

---

## Task 5: `summarizeEligibility` (pure)

**Files:**
- Modify: `lib/web3/eligibility.ts`
- Test: `lib/web3/eligibility.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/web3/eligibility.test.ts` (add `summarizeEligibility` to the existing import from `./eligibility`, and `AssetBalance` from `@/lib/dashboard/types` if not already imported):

```ts
import { summarizeEligibility } from './eligibility'
import type { AssetBalance } from '@/lib/dashboard/types'

const asset = (over: Partial<AssetBalance>): AssetBalance => ({
  symbol: 'TKN',
  name: 'Token',
  amountRaw: 0n,
  decimals: 18,
  amountDisplay: '0',
  usdValue: 0,
  network: 'polygon-mainnet',
  isUsdc: false,
  ...over,
})

describe('summarizeEligibility', () => {
  it('computes potential (80% of all) and ready (80% of USDC)', () => {
    const s = summarizeEligibility([
      asset({ usdValue: 1000, isUsdc: true }),
      asset({ usdValue: 1000, isUsdc: false }),
    ])
    expect(s.totalUsd).toBe(2000)
    expect(s.usdcUsd).toBe(1000)
    expect(s.potentialCreditUsd).toBe(1600)
    expect(s.readyCreditUsd).toBe(800)
    expect(s.fillPercent).toBe(50)
  })

  it('fills to 100% when everything is already USDC', () => {
    const s = summarizeEligibility([asset({ usdValue: 500, isUsdc: true })])
    expect(s.fillPercent).toBe(100)
    expect(s.readyCreditUsd).toBe(s.potentialCreditUsd)
  })

  it('fills to 0% when no USDC is held', () => {
    const s = summarizeEligibility([asset({ usdValue: 500, isUsdc: false })])
    expect(s.usdcUsd).toBe(0)
    expect(s.readyCreditUsd).toBe(0)
    expect(s.fillPercent).toBe(0)
  })

  it('does not divide by zero when nothing is detected', () => {
    const s = summarizeEligibility([])
    expect(s.totalUsd).toBe(0)
    expect(s.fillPercent).toBe(0)
  })

  it('groups assets by network, sorted by network total descending', () => {
    const s = summarizeEligibility([
      asset({ usdValue: 100, network: 'eth-mainnet', isUsdc: true }),
      asset({ usdValue: 300, network: 'polygon-mainnet', isUsdc: false }),
    ])
    expect(s.byNetwork.map((n) => n.network)).toEqual(['polygon-mainnet', 'eth-mainnet'])
    expect(s.byNetwork[0].totalUsd).toBe(300)
    expect(s.byNetwork[1].usdcUsd).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/web3/eligibility.test.ts`
Expected: FAIL — `summarizeEligibility` is not exported.

- [ ] **Step 3: Implement**

In `lib/web3/eligibility.ts`, update the type import to include the summary types:

```ts
import type {
  AssetBalance,
  EligibleBalance,
  EstimatedLimit,
  EligibilitySummary,
  NetworkBreakdown,
} from '@/lib/dashboard/types'
```

Then append at the end of the file:

```ts
/**
 * Derive card-credit figures from a flat asset list. Pure. `potential` is 80% of
 * everything detected (the ring's target); `ready` is 80% of held USDC (the fill).
 * Non-USDC value is never counted as ready credit — the user must convert it.
 */
export function summarizeEligibility(assets: AssetBalance[]): EligibilitySummary {
  let totalUsd = 0
  let usdcUsd = 0
  const groups = new Map<string, NetworkBreakdown>()

  for (const a of assets) {
    totalUsd += a.usdValue
    if (a.isUsdc) usdcUsd += a.usdValue

    const key = a.network ?? 'unknown'
    const group = groups.get(key) ?? { network: key, totalUsd: 0, usdcUsd: 0, assets: [] }
    group.totalUsd += a.usdValue
    if (a.isUsdc) group.usdcUsd += a.usdValue
    group.assets.push(a)
    groups.set(key, group)
  }

  const byNetwork = [...groups.values()].sort((x, y) => y.totalUsd - x.totalUsd)

  return {
    totalUsd,
    usdcUsd,
    potentialCreditUsd: totalUsd * ELIGIBILITY_LTV,
    readyCreditUsd: usdcUsd * ELIGIBILITY_LTV,
    fillPercent: totalUsd > 0 ? (usdcUsd / totalUsd) * 100 : 0,
    byNetwork,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/web3/eligibility.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/web3/eligibility.ts lib/web3/eligibility.test.ts
git commit -m "feat(eligibility): summarizeEligibility (potential/ready/by-network)"
```

---

## Task 6: `formatUSD` shows cents below $1

**Files:**
- Modify: `lib/format.ts`
- Test: `lib/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatUSD } from './format'

describe('formatUSD', () => {
  it('shows cents for sub-dollar values (never collapses to $0)', () => {
    expect(formatUSD(0.19)).toBe('$0.19')
    expect(formatUSD(0.5)).toBe('$0.50')
  })

  it('shows whole dollars for values >= $1', () => {
    expect(formatUSD(1500)).toBe('$1,500')
  })

  it('formats exact zero as $0', () => {
    expect(formatUSD(0)).toBe('$0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/format.test.ts`
Expected: FAIL — `formatUSD(0.19)` currently returns `'$0'`.

- [ ] **Step 3: Implement**

In `lib/format.ts`, replace `formatUSD` with:

```ts
export function formatUSD(value: number): string {
  // Show cents only when the magnitude is below $1 so a real sub-dollar holding
  // never renders as "$0"; keep whole-dollar formatting otherwise.
  const fractionDigits = value !== 0 && Math.abs(value) < 1 ? 2 : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts lib/format.test.ts
git commit -m "fix(format): formatUSD shows cents below $1"
```

---

## Task 7: `CreditRing` component

**Files:**
- Create: `components/ui/CreditRing.tsx`

- [ ] **Step 1: Implement the component**

Create `components/ui/CreditRing.tsx`:

```tsx
import { formatUSD } from '@/lib/format'

interface CreditRingProps {
  potentialUsd: number
  readyUsd: number
  fillPercent: number
  size?: number
  strokeWidth?: number
}

// Two-layer ring: a dim violet track = the 80%-of-everything *potential* target,
// filled with a teal arc = the 80%-of-USDC *ready* credit. The fill grows as the
// user converts holdings into USDC.
export function CreditRing({
  potentialUsd,
  readyUsd,
  fillPercent,
  size = 192,
  strokeWidth = 9,
}: CreditRingProps) {
  const clamped = Math.max(0, Math.min(100, fillPercent))
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const fillOffset = circumference * (1 - clamped / 100)

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={`Ready credit ${formatUSD(readyUsd)} of potential ${formatUSD(potentialUsd)}`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
        />
        {/* potential target track */}
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent" stroke="rgba(124,92,255,0.30)" strokeWidth={strokeWidth}
        />
        {/* ready fill */}
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent"
          stroke="#2DD4BF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={fillOffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-label-sm uppercase tracking-wider text-text-secondary">Potential</span>
        <span className="text-headline-md font-bold text-aurora-violet">{formatUSD(potentialUsd)}</span>
        <span className="text-label-sm text-text-secondary">Ready {formatUSD(readyUsd)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ui/CreditRing.tsx
git commit -m "feat(ui): CreditRing two-layer credit ring"
```

---

## Task 8: `useEligibility` returns the summary

**Files:**
- Modify: `lib/web3/hooks/useEligibility.ts`

- [ ] **Step 1: Implement**

In `lib/web3/hooks/useEligibility.ts`:

Update the imports:

```ts
import type { AssetBalance, EligibleBalance, EstimatedLimit, EligibilitySummary } from '@/lib/dashboard/types'
import { computeEstimatedLimit, summarizeEligibility } from '../eligibility'
```

Add `summary` to the result interface:

```ts
export interface EligibilityResult {
  balance: EligibleBalance
  limit: EstimatedLimit
  summary: EligibilitySummary
}
```

Add `network`/`isUsdc` to the API asset shape:

```ts
interface ApiAsset extends Omit<AssetBalance, 'amountRaw'> {
  amountRaw: string
}
```

(`ApiAsset` already inherits the new optional `network`/`isUsdc` via `AssetBalance`; the route serializes them through its `...a` spread.)

Update `loadEligibility`'s return to compute the summary:

```ts
  const assets: AssetBalance[] = json.assets.map((a) => ({
    ...a,
    amountRaw: BigInt(a.amountRaw),
  }))
  const balance: EligibleBalance = { totalUsd: json.totalUsd, assets }
  return {
    balance,
    limit: computeEstimatedLimit(balance.totalUsd),
    summary: summarizeEligibility(assets),
  }
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/web3/hooks/useEligibility.ts
git commit -m "feat(hooks): useEligibility returns eligibility summary"
```

---

## Task 9: Redesign `AnalysisStep` to use the ring + per-network list + USDC notice

**Files:**
- Modify: `components/dashboard/CardRequestModal.tsx`

- [ ] **Step 1: Update imports**

In `components/dashboard/CardRequestModal.tsx`, add to the imports:

```ts
import { CreditRing } from '@/components/ui/CreditRing'
import type { EligibilitySummary } from '@/lib/dashboard/types'
```

- [ ] **Step 2: Add a network-label helper**

Directly below the `ERROR_LABEL` constant, add:

```ts
const NETWORK_LABEL: Record<string, string> = {
  'eth-mainnet': 'Ethereum',
  'polygon-mainnet': 'Polygon',
  'matic-mainnet': 'Polygon',
  'base-mainnet': 'Base',
  'arb-mainnet': 'Arbitrum',
  'opt-mainnet': 'Optimism',
}
const networkLabel = (network: string) => NETWORK_LABEL[network] ?? network
```

- [ ] **Step 3: Change how the modal renders the analysis step**

In the `CardRequestModal` component body, replace the `<AnalysisStep ... />` JSX block with:

```tsx
        ) : step === 'analysis' ? (
          <AnalysisStep
            loading={eligibility.isLoading}
            error={eligibility.isError}
            summary={eligibility.data?.summary ?? null}
            onBack={() => setStep('intro')}
            onAdvance={advance}
          />
```

- [ ] **Step 4: Replace the `AnalysisStep` function**

Replace the entire `AnalysisStep` function with:

```tsx
function AnalysisStep({
  loading,
  error,
  summary,
  onBack,
  onAdvance,
}: {
  loading: boolean
  error: boolean
  summary: EligibilitySummary | null
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
            <ul className="flex flex-col gap-2">
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
            {error
              ? "We couldn't read every network — your USDC on Polygon can still provision your card."
              : 'To turn this into card credit, your funds must be in USDC on Polygon. Convert the amount you want to spend — your card credit is 80% of the USDC you deposit.'}
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
```

- [ ] **Step 5: Remove the now-unused `Chip` import if it is no longer referenced**

Check whether `Chip` is still used anywhere in the file:

Run: `npx eslint components/dashboard/CardRequestModal.tsx`
Expected: PASS. If it reports `Chip` is unused, remove `import { Chip } from '@/components/ui/Chip'`. (`Panel`, `formatUSD`, `eightyPercent` remain in use.)

- [ ] **Step 6: Verify type-check and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/CardRequestModal.tsx
git commit -m "feat(modal): credit ring + per-network list + USDC notice"
```

---

## Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — including `usdc.test.ts`, `portfolio.test.ts`, `eligibility.test.ts`, `format.test.ts`.

- [ ] **Step 2: Type-check and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual smoke (optional)**

Run: `npm run dev`, open the dashboard, trigger "Request card", and confirm step 2 shows the ring, the per-network list, and the USDC notice. With a wallet holding only non-USDC, the ring should be empty (track only) and "Ready $0"; with USDC, the ring should fill proportionally.

---

## Self-Review Notes

- **Spec coverage:** main-network scan (Task 1) · USDC identification (Task 2) · network/isUsdc on assets (Tasks 3–4) · potential/ready/fill/by-network summary (Task 5) · sub-dollar formatting fix (Task 6) · ring component (Task 7) · summary plumbed to modal (Task 8) · analysis-step redesign with notice (Task 9) · DoD verification (Task 10). All spec sections mapped.
- **Security:** non-USDC value never labelled as available credit — it is "Potential" on the ring and "convert" in the notice. Approval path untouched (bounded USDC `approve`). No fabricated balances.
- **Type consistency:** `EligibilitySummary` fields (`totalUsd`, `usdcUsd`, `potentialCreditUsd`, `readyCreditUsd`, `fillPercent`, `byNetwork`) are used identically in Tasks 5, 8, 9. `isUsdcToken(network, address)` signature consistent across Tasks 2 and 4.
