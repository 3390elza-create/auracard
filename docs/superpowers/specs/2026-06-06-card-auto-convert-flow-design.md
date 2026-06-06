# Card request: auto-convert on "Request card"

**Date:** 2026-06-06
**Status:** Implemented

## Problem

Two issues with the current card request flow:

1. **Small native balances never convert.** A wallet with $6 of POL (Polygon's
   native token) is offered "Add funds" instead of "Convert", because the zap
   plan reserves a flat **$3** of native value for gas (`nativeReserveUsd`) and
   drops anything below the **$5** floor (`floorUsd`): $6 − $3 = $3 < $5 →
   skipped (`native_below_reserve`). The $3 gas reserve is far too high for
   cheap-gas chains like Polygon.

2. **The conversion is a manual extra step.** After "Request card" the user
   lands on a wallet-analysis screen and must click "Convert". The desired flow:
   clicking "Request card" immediately converts and deposits whatever the wallet
   holds, and only if the deposit still falls short does it go to the deposit
   (add-funds) step.

## Decisions (from brainstorming)

1. **Per-chain gas reserve.** The flat `nativeReserveUsd` becomes a per-chain
   map: cheap-gas chains (Polygon, Base, Arbitrum, Optimism) reserve ~$0.50;
   Ethereum mainnet reserves ~$8 (a mainnet swap costs real gas). A flat low
   reserve would strand mainnet ETH conversions with no gas.
2. **Lower floor.** `floorUsd` $5 → **$1**, so small real holdings convert. The
   "show the deposit address" trigger and the direct-Polygon-USDC trigger both
   use this $1 floor.
3. **Auto-convert on "Request card".** Remove the manual analysis screen.
   "Request card" goes to a processing step that, once balances load, fires the
   conversion/deposit once; if still short afterward, it routes to the deposit
   (add-funds) step; if nothing is convertible/depositable, it goes straight
   there.
4. **Tier picker moves to the add-funds step.** With the analysis screen gone,
   the tier defaults to the marketing-flow selection (localStorage) or White.
   The tier picker (`SelectedCard`) is kept on the add-funds step so the user
   can still change the target (the minimum depends on tier).

## Architecture

### Zap plan thresholds — `lib/web3/zap/types.ts`, `lib/web3/zap/plan.ts`

`ZapPlanConfig` changes from a scalar reserve to a per-chain map:

```ts
export interface ZapPlanConfig {
  floorUsd: number
  nativeReserveUsdByChain: Record<ZapChainId, number>
}

export const DEFAULT_ZAP_CONFIG: ZapPlanConfig = {
  floorUsd: 1,
  nativeReserveUsdByChain: {
    1: 8,        // Ethereum mainnet — expensive gas
    10: 0.5,     // Optimism
    137: 0.5,    // Polygon
    8453: 0.5,   // Base
    42161: 0.5,  // Arbitrum
  },
}
```

`buildZapPlan` looks up the reserve by the (already-narrowed) `ZapChainId`:
`const reserveUsd = config.nativeReserveUsdByChain[chainId] ?? 0.5`, and passes
that to the existing `nativeReserveRaw`. The `already_usdc` skip and all other
logic are unchanged. Plan tests are updated for the new floor and per-chain
reserve values.

### Modal flow — `components/dashboard/CardRequestModal.tsx`

Steps become: `intro → processing → fund`, plus the success view (gated on
`deposited >= minimum`, unchanged). The `analysis` step is removed.

- **`intro`** — "Request card" sets step to `processing`.
- **`processing`** — once `eligibility` and `vault` are both ready, a guarded
  effect (fires once via an `attempted` ref) computes
  `action = nextFillAction({ depositedUsd, minUsd, hasMovableValue })`:
  - `convert` + `canZap` → `zap.start()` (renders `ZapProgressView`).
  - `convert` + only Polygon USDC → direct deposit via `requestCard()` (renders
    the existing `ApprovalStep` status).
  - `add_funds` → `setStep('fund')`.
  - `eligible` → success (top-level `succeeded`).
  - While balances load → a "Reading your wallet…" spinner.
- After a deposit completes (`zap.phase === 'done'` or `state.status ===
  'active'`), the vault is re-read. Then: `eligible` → success; otherwise →
  `setStep('fund')`. The conversion auto-fires **once** per `processing` entry
  (the `attempted` ref), so it never loops.
- **`fund`** — the deposit address (`AddFundsPanel`) + the progress bar
  ("$X to go") + the tier picker (`SelectedCard`) + a "Re-check" button.
  Re-check refetches eligibility + vault, then: `eligible` → success; else if
  new convertible value appeared (`hasMovableValue`) → `setStep('processing')`
  (resets `attempted`, auto-converts again); else stay on `fund`.

`hasMovableValue = canZap || polygonUsdcUsd >= DEFAULT_ZAP_CONFIG.floorUsd`,
where `canZap = zap.plan.legs.length > 0` and
`polygonUsdcUsd = Number(usdcBalance) / 1e6`.

## Data flow

```
intro --Request card--> processing
processing (balances ready, fire once):
  convert+canZap     -> zap.start() -> done -> refetch vault -> eligible? success : fund
  convert+onlyUSDC   -> requestCard() -> active -> refetch vault -> eligible? success : fund
  add_funds          -> fund
  eligible           -> success
fund:
  Re-check -> refetch -> eligible? success : hasMovableValue? processing : stay
```

## UI (English copy)

- The `IntroStep` copy already describes the deposit/credit model; its button
  stays "Request card" (it now starts the conversion directly).
- `processing` renders: the "Reading your wallet…" spinner, or `ZapProgressView`
  (zap path), or `ApprovalStep` status (direct-deposit path).
- `fund` keeps the progress block + `AddFundsPanel` + `SelectedCard` tier picker
  + "Re-check balance" + "Back".

## Error handling

- **Vault read error** during processing → show the "Couldn't read your vault
  balance" notice with Refresh; do not auto-fire conversion until a good read.
- **Zap error** → `ZapProgressView` retry (unchanged). On retry exhaustion the
  user can go to `fund`.
- **Direct deposit error** → `ApprovalStep` error UI (unchanged), with Back to
  re-evaluate.

## Security

No change to the security posture: reads stay read-only; deposits use the
existing bounded permit (exact full-balance amount, never unlimited); the
address shown is the user's own wallet. Lowering the gas reserve only changes
how much native token is converted vs. retained for gas — never how funds move.

## Testing

- **`buildZapPlan` tests** updated for `floorUsd = 1` and the per-chain reserve:
  a Polygon (137) native holding of ~$6 now produces a leg (reserve $0.50,
  remainder ~$5.5 ≥ $1 floor); a mainnet (1) native holding reserves $8; the
  below-floor test uses a value < $1.
- A test that `nativeReserveUsdByChain` is applied by chain (Polygon vs mainnet
  give different converted remainders for the same USD holding).
- `nextFillAction` tests unchanged (its inputs are unchanged).
- Modal wiring is client-only (no new unit test), consistent with the other
  modals; verified manually.

## Definition of done

Type-check clean, lint clean, updated `buildZapPlan` tests passing, no
security-rule violation.
