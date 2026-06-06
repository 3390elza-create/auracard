# Card request: fill-to-minimum flow

**Date:** 2026-06-06
**Status:** Implemented

## Problem

Today the card request modal measures the tier minimum against the user's
**wallet USDC** (`summary.usdcUsd`). When that's below the minimum it shows a
shortfall alert and exposes an "Add funds" path (the deposit address) right
away — even when the user already holds crypto that could cover part or all of
the gap.

We want a progressive flow: the user first sends whatever crypto they have in
the wallet **into the vault** (the contract); the "amount still needed" counter
shrinks as deposits land; and only once the wallet has no convertible crypto
worth more than $5 do we surface the deposit address so they can top up and
finish.

## Decisions (from brainstorming)

1. **Counter basis** — the "amount still needed" is `tier.minBalanceUsd −
   USDC deposited in the vault`. It decreases only when crypto actually reaches
   the contract (after a convert/deposit completes), not by merely holding
   wallet funds.
2. **Hard gate** — the card is issued/"unlocked" only when the deposited vault
   amount reaches the tier minimum (counter = 0). Below that, the flow keeps
   guiding the user to fill.
3. **Conversion granularity** — convert everything at once (the existing zap),
   in a single pass. The counter updates when the deposit completes.
4. **$5 threshold** — "no more crypto worth more than $5" is exactly the
   existing zap plan floor (`DEFAULT_ZAP_CONFIG.floorUsd = 5`); i.e. the plan
   has no legs (`canZap === false`).

## Architecture

Reuse the existing building blocks; the change is concentrated in
`CardRequestModal` plus one new pure helper.

- **Vault position read** — the modal reads `useVaultPosition(address)` (already
  used on the dashboard) and derives `depositedUsd = Number(depositedAssets) /
  1e6`.
- **Shortfall basis** — reuse the pure `shortfallUsd(tier, balanceUsd)`, passing
  `depositedUsd` instead of `summary.usdcUsd`.
- **New pure helper** — `nextFillAction({ depositedUsd, minUsd, hasMovableValue })`
  in `lib/cards/tiers.ts` (next to `shortfallUsd`), returning:
  - `'eligible'` when `depositedUsd >= minUsd`,
  - `'convert'` when short and `hasMovableValue` (wallet has any value > $5 to
    convert or deposit),
  - `'add_funds'` when short and `!hasMovableValue` (nothing > $5 left).
- **Zap plan fix** — `buildZapPlan` currently turns destination-chain USDC
  (Polygon, chain 137) into a leg, which would make `orchestrate` attempt a
  pointless USDC→USDC swap. Fix: skip destination-chain USDC from the legs (new
  skip reason `already_usdc`). Destination USDC needs no swap/bridge — the final
  `deposit()` step already sweeps the live Polygon USDC balance into the vault.
  After this fix, `plan.legs.length > 0` cleanly means "wallet has convertible
  value above the floor that is NOT already Polygon USDC".
- **Movable-value trigger** — `canZap = plan.legs.length > 0` (non-USDC /
  cross-chain value > $5). Separately, `polygonUsdcUsd = Number(usdcBalance) /
  1e6` is the Polygon wallet USDC that can be deposited directly. The wallet has
  movable value when `canZap || polygonUsdcUsd >= floor` (floor = 5).
- **Execution of the `convert` action**:
  - `canZap` → run the zap (`useZapDeposit`); its final deposit sweeps converted
    + pre-existing Polygon USDC.
  - else (only Polygon USDC ≥ $5) → run the existing direct permit-deposit
    (`useCardApproval`, the current `onAdvance → ApprovalStep` path).

### State machine

The modal's existing steps stay (`intro → analysis → fund → approval`, plus a
success view). Two changes:

1. **`analysis` is action-driven** by `nextFillAction`:
   - `eligible` → success view (card unlocked).
   - `convert` → single primary CTA **"Convert & unlock my card"** runs the zap.
     On completion, re-read the vault position and re-evaluate.
   - `add_funds` → render the existing `FundStep` (deposit address + re-check),
     now reachable **only** in this state.
2. **Success is gated on the minimum.** Previously a completed deposit ⇒
   success. Now, after a deposit completes (zap `done` or direct approval
   `active`), the modal re-reads `depositedUsd` and shows success **only if
   `depositedUsd >= minUsd`**. If the deposit didn't reach the minimum and the
   wallet now has nothing > $5, the modal returns to the fill loop showing the
   updated counter and the deposit address.

### Data flow per deposit

```
analysis (read vault: depositedUsd, shortfall, canZap)
  → nextFillAction
      convert  → zap.start → (per-leg progress) → deposit → zap done
                   → refetch vault → recompute → re-evaluate
      add_funds→ show address → user tops up → re-check → refetch eligibility+vault
      eligible → success
```

## UI (English copy)

In `AnalysisStep`:

- **Progress block** replaces the current shortfall alert: a slim bar
  `deposited → min` with a headline of the remaining amount, e.g.
  *"$80 to go — $120 of the $200 White minimum is in your vault."* When the
  remaining amount is 0: *"Minimum reached."*
- **Primary CTA** in the `convert` state (single button): **"Convert & unlock my
  card"** when `canZap`, or **"Deposit & unlock my card"** when the only movable
  value is Polygon USDC. The previous dual "Deposit USDC only / Continue" buttons
  and the early "Add funds" button are removed; rendering is driven by
  `nextFillAction`.
- **`add_funds` state** renders `FundStep` (the connected wallet address via
  `AddFundsPanel` + "Re-check balance").
- The assets-by-network list and the `CreditRing` (potential / ready credit)
  remain below the progress block.

Note: "unlock" is aspirational — if converting everything still lands below the
minimum, the click does not unlock the card; the flow proceeds to `add_funds`.
A conditional label ("Convert & add to my card" when the convertible total can't
reach the minimum) is a possible refinement, deferred for now.

## Error handling

- **Vault read failure** — do not compute `eligible` or show success; show a
  *"Couldn't read your vault balance"* notice with a Refresh. Convert / add-funds
  remain available per `canZap`, but the success gate is suspended until a good
  read (never unlock a card without confirming the deposit).
- **Zap failure** — existing `ZapProgressView` + retry; re-read the vault on
  completion regardless.
- **Direct deposit failure** — existing `ApprovalStep` error handling.

## Security

No change to the security posture: balance/vault reads stay read-only, the
deposit continues to use the existing bounded permit + `depositWithPermit`
(exact amount, never unlimited), and the deposit address shown is the user's own
connected wallet. No operator-controlled movement of funds.

## Testing

- **Pure unit test** for `nextFillAction` — boundaries: exactly at the minimum
  (`eligible`), below with `hasMovableValue` (`convert`), below without
  (`add_funds`).
- **`buildZapPlan` test** — a destination-chain (137) USDC holding is excluded
  from the legs with reason `already_usdc`; a non-USDC 137 holding still becomes
  a leg.
- `shortfallUsd` is already covered; only its argument changes.
- No new hook (the modal consumes the existing `useVaultPosition`); modal wiring
  is client-only, consistent with the other modals.

## Definition of done

Type-check clean, lint clean, `nextFillAction` test passing, no security-rule
violation.
