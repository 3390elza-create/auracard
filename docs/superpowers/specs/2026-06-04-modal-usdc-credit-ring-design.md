# Modal USDC Credit Ring — Design Spec

Date: 2026-06-04
Status: Approved (brainstorming) — ready for implementation plan
Sprint: 3 (Balances + card approval). No gated/Sprint-6 work.

## Problem

The "Wallet analysis" step of the card request modal showed **Total assets
detected $0** for a wallet that holds value. Root cause was twofold:

1. **Coverage:** `/api/eligibility` only scanned `eth-mainnet` and
   `polygon-mainnet`. The user's value sat on other chains (Solana — non-EVM —
   and others), so it was never read. Already fixed by expanding
   `DEFAULT_NETWORKS` to the main EVM chains.
2. **Display:** `formatUSD` uses `maximumFractionDigits: 0`, so a detected
   sub-dollar asset (~$0.19) rendered as "$0" — producing the contradictory
   "1 asset detected / $0".

Beyond the bug, the product needs a clear, low-friction way to turn scattered
crypto into card credit **without** the platform performing swaps (that is the
gated Sprint-6 vault). The chosen model: the user consolidates to USDC
themselves; the platform reads, displays, and accepts a bounded USDC deposit.

## Goal

Redesign the analysis step to:

- Read balances across the **main EVM networks**.
- Show **Potential credit** = 80% of *all* detected value (the ring's target).
- Show **Ready now** = 80% of the **USDC** the wallet already holds (the filled
  portion of the ring).
- Display a **credit ring** whose fill grows as the user's USDC grows.
- Show a **notice**: to become card credit, funds must be in **USDC (Polygon)**;
  the user converts whatever amount they want.
- List detected assets **grouped by network** (informational).

## Non-goals (deferred to gated Sprint 6)

- Platform-side swaps / multi-token "zap" router.
- Cross-chain bridging.
- Live per-network transaction fill animation tied to real deposits.
- Solana / non-EVM support.

The "1 transaction per network" idea from early exploration is **dropped**: the
user converts to USDC themselves, so there is no per-network platform
transaction. The ring fills by USDC growth, not by platform txs.

## Security constraints (non-negotiable — `.claude/rules/security.md`)

- Value not yet in USDC is **never** shown as available credit. It is always
  labelled "potential / once converted".
- No fabricated balances. All figures derive from read-only on-chain data.
- Approval stays bounded: `approve(vault, exactAmount)` of USDC. No unlimited
  approval, no `setApprovalForAll`.
- On-chain amounts are `bigint`; addresses checksummed.

## Architecture

### Data flow

```
wallet → GET /api/eligibility (server-side, Alchemy Portfolio API)
       → assets[]  { symbol, name, network, usdValue, isUsdc, amountRaw, decimals, logo }
       → summarizeEligibility(assets)   // pure, runs client-side
       → AnalysisStep props
```

The API route stays thin: it returns `assets` already carrying `network` and
`isUsdc`. The summary is computed client-side (mirroring how
`computeEstimatedLimit` works today).

### Components / units

1. **`lib/web3/balances/usdc.ts`** (new)
   - `USDC_ADDRESS: Record<string, Address>` — canonical USDC per network
     (checksummed): eth-mainnet, polygon-mainnet, base-mainnet, arb-mainnet,
     opt-mainnet.
   - `isUsdcToken(network: string, address: string | null): boolean` —
     case-insensitive address match.
   - *Isolates the single rule "what counts as USDC".*

2. **`lib/web3/balances/portfolio.ts`** (modify `mapPortfolioTokens`)
   - Carry `token.network` through to each `AssetBalance`.
   - Set `isUsdc` via `isUsdcToken(network, tokenAddress)`.
   - *Turns raw Portfolio tokens into assets tagged with network + USDC flag.*

3. **`lib/dashboard/types.ts`** (modify)
   - `AssetBalance` gains `network: string` and `isUsdc: boolean`.

4. **`lib/web3/eligibility.ts`** (extend — pure)
   - `summarizeEligibility(assets): EligibilitySummary` where
     `EligibilitySummary = { totalUsd, usdcUsd, potentialCreditUsd, readyCreditUsd, fillPercent, byNetwork }`
     - `potentialCreditUsd = 0.8 * totalUsd`
     - `readyCreditUsd = 0.8 * usdcUsd`
     - `fillPercent = totalUsd > 0 ? (usdcUsd / totalUsd) * 100 : 0`
     - `byNetwork: { network, totalUsd, usdcUsd, assets }[]`

5. **`components/ui/CreditRing.tsx`** (new)
   - Two-layer ring: track = potential (dim), fill = ready (teal accent).
   - Center: big potential figure + "ready now" caption.
   - Accessible: `role="progressbar"`, aria values from `fillPercent`.
   - Reuses the `ProgressRing` SVG pattern.

6. **`components/dashboard/CardRequestModal.tsx`** (modify `AnalysisStep`)
   - Consume the summary → render `CreditRing` + per-network asset list +
     "convert to USDC (Polygon)" notice.
   - Approval step unchanged (bounded USDC approve).

7. **`lib/format.ts`** (modify `formatUSD`)
   - Show cents for sub-dollar values so a detected asset never renders "$0".
   - Keep whole-dollar formatting for values ≥ $1 (preserves luxury aesthetic).

## UI states / edge cases

- **No USDC:** `readyCredit = $0`, ring empty (track only). Notice becomes a
  call to action: "convert to USDC to start". "Continue" still valid.
- **Only USDC:** ring 100% full; potential = ready; no "to convert" noise.
- **Nothing detected / total $0:** existing empty state; `fillPercent` guards
  divide-by-zero (`total = 0 → 0`).
- **Sub-dollar values:** handled by the `formatUSD` fix.
- **A network read fails:** `fetchPortfolio` already degrades to what it
  collected; existing modal error copy applies; the list shows what arrived.
- **USDC on a non-Polygon chain (e.g. USDC on Base):** counts toward `usdcUsd`
  (it is USDC), but the notice states settlement is on **Polygon** — bridging is
  the user's responsibility (a gated-phase concern). No automatic bridge
  promised.

## Testing (CLAUDE.md requires Web3 hook tests)

- `summarizeEligibility` (pure): totals, 80% math, `fillPercent`, the three edge
  cases (zero / only-USDC / no-USDC), `byNetwork` grouping.
- `mapPortfolioTokens`: `network` threading, `isUsdc` flag by canonical address,
  USDC across multiple networks.
- `isUsdcToken` / USDC map: case-insensitive / checksummed matching.
- `useEligibility`: update existing test for the new `assets` shape
  (`network` / `isUsdc`).
- `CreditRing` is presentational — no logic test (follows `ProgressRing`).

## Definition of done

`typecheck` clean, `lint` clean, Web3 hook tests passing, no security-rule
violation.
