# Cross-Chain USDC Zap Deposit — Design Spec

Date: 2026-06-05
Status: Draft (brainstorming) — awaiting user review
Sprint: 3/5 (balances + card approval + onboarding). **No gated Sprint-6 work** —
see "Security & gating" below for why client-side swaps do not trigger the vault gate.

## Problem

Today the card-request flow tells the user to **convert all their crypto to USDC
on Polygon themselves** before depositing ([CardRequestModal.tsx](../../../components/dashboard/CardRequestModal.tsx)
AnalysisStep notice). That is a critical friction: a user holding ETH, WBTC,
USDT, or assets on other chains must manually swap *and* consolidate to Polygon
USDC before they can get a card. Most users abandon at that point.

We want the platform to do that consolidation for the user: **any major token on
any supported chain → USDC on Polygon → deposit → card credit**, with one
automatic, guided flow — while staying strictly non-custodial and within the
existing security rules.

## Goal

For each supported **source chain** the user holds value on:

1. Swap their tokens → USDC on that chain (via an external DEX aggregator).
2. Bridge that USDC to **Polygon** (via Circle CCTP — native USDC).
3. Deliver the USDC to the **user's own Polygon address**.
4. Run the **existing** `depositWithPermit` flow → vault mints `$AURA` shares to
   the user.

All steps are **user-signed**; funds always move from the user, through external
audited infrastructure, to the user's own address, then into the existing vault.
No operator, no new vault logic, no unbounded approval.

## Scope

### v1 (this spec)
- **EVM source chains only:** Ethereum, Base, Arbitrum, Optimism, Polygon
  (Polygon = no bridge needed; just swap + deposit).
- **Automatic token selection** with protections (min-value floor, gas reserve).
- **Approach A delivery:** aggregator delivers USDC to the user's Polygon
  address; the existing `depositWithPermit` does the crediting. The vault
  contract is **unchanged**.
- **Provider:** LI.FI (swap+bridge aggregation, routes USDC via Circle CCTP).

### Deferred (explicitly out of v1)
- **Solana / non-EVM (Phase 2):** requires a Solana wallet adapter
  (Reown AppKit multichain), Sign-In with Solana, Jupiter for swaps, and a
  Solana→Polygon bridge (Wormhole/Mayan). Large, separate effort.
- **Approach B (direct-to-vault):** aggregator deposits straight into the vault
  via a LI.FI destination call. Needs a `deposit(assets, receiver)` entrypoint on
  the vault so shares mint to the real user, not the relayer. Future optimization.
- Any vault-side / operator-side swap (`executeSwap`) — that **is** gated Sprint 6.

## Security & gating (non-negotiable — `.claude/rules/security.md`, `solidity.md`)

This is the crux. The prior spec deferred "platform-side swaps" to gated Sprint 6.
This design does **not** trigger that gate, because:

- **The swap is client-side and user-signed.** It happens in the user's wallet
  against an external, audited aggregator router — **not** inside our vault and
  **not** by an operator role. `solidity.md`'s gate is about the *vault contract*
  performing operator swaps (`executeSwap`); we add none.
- **The vault contract is untouched.** We reuse `depositWithPermit` exactly as-is.
- **No operator ever moves user funds.** Every leg (approve, swap, bridge burn,
  deposit) is signed by the user. The bridge mint on Polygon lands in the
  **user's own address**.
- **Approvals stay bounded.** Each swap uses **Permit2 single-use** (exact amount
  + expiry) or `approve(spender, exactAmount)`. **Never** `type(uint256).max`,
  `MaxUint256`, or `setApprovalForAll`. The PreToolUse hook
  `.claude/hooks/block-unsafe-web3.sh` stays on and must pass.
- **No blind signatures.** EIP-712 typed data only; no `eth_sign`.
- **External-provider trust is disclosed, not hidden.** LI.FI router + Circle
  CCTP are the only third parties; both are widely audited. The user authorizes
  the exact amount to the aggregator's allowance target per swap.
- On-chain amounts are `bigint`; all addresses checksummed and validated.

If any requirement here cannot be met by the chosen provider, we stop and
re-evaluate rather than relax a rule.

## Architecture

### Module layout (all Web3 logic in `lib/web3/`)
- `lib/web3/zap/providers/lifi.ts` — thin wrapper over the LI.FI SDK: quote a
  route (`fromChain`, `fromToken`, `amount` → USDC on Polygon), build the
  transaction(s), and read execution status. No UI, no React.
- `lib/web3/zap/plan.ts` — **pure** functions: from an eligibility asset list,
  produce a `ZapPlan` — the per-chain set of tokens to convert, after applying
  the min-value floor and native gas reserve. Fully unit-tested.
- `lib/web3/zap/machine.ts` — **pure** reducer for the cross-chain deposit state
  machine (states + transitions, below). No side effects; unit-tested.
- `lib/web3/zap/persistence.ts` — serialize/restore in-flight runs to
  `localStorage` keyed by `address` (resume after a refresh). SSR-safe.
- `lib/web3/hooks/useZapDeposit.ts` — orchestrates the machine with wagmi/viem +
  the provider + the existing `useCardApproval` for the final Polygon deposit.
- UI: extend `CardRequestModal` `AnalysisStep` to render the plan and drive the
  state machine; reuse the `CreditRing` (fill grows as legs complete).

### Per-source-chain flow
```
approve (Permit2, exact)  ─┐
                           ├─ aggregator: swap token → USDC (source chain)
                           ┘
CCTP burn (source) → attestation (off-chain, relayed) → CCTP mint (Polygon)
                           ↓
USDC in user's Polygon wallet
                           ↓
depositWithPermit (existing) → vault mints $AURA shares to user
```
Polygon-native tokens skip the bridge: swap → deposit.

### Shares
Unchanged from today. Shares are minted by the vault at the final
`depositWithPermit`, to `msg.sender` = the user (Approach A). The cross-chain
legs only change the *source* of the USDC. `convertToAssets(shares)` gives the
USD display. (This is exactly why Approach A is chosen over B — see Deferred.)

## The cross-chain deposit state machine (the hard part)

Because the bridge is asynchronous (minutes) and multi-step, the deposit is no
longer a single click. The flow is modeled as an explicit, **resumable** machine,
run **per source chain** (chains processed sequentially in v1 for simpler UX).

Per-chain states:
- `idle` → `quoting` (fetch route) → `awaiting_approval` (Permit2 sign) →
  `swapping` (swap tx) → `bridging` (CCTP burn submitted; poll attestation) →
  `arriving` (mint relayed on Polygon; poll for USDC arrival) →
  `depositing` (existing permit+deposit) → `done`.
- Any state → `error{reason, atState}` with a **resume token** so retry continues
  from the failed leg, not the beginning.

Run-level:
- A `ZapRun` = the ordered list of per-chain legs + their states, persisted after
  every transition.
- On modal open we **restore** any in-flight run for the address and resume
  polling (e.g., user closed the tab mid-bridge). The user sees
  "USDC in transit from Arbitrum… ~3 min left" rather than a reset.

### Resume / idempotency rules
- Each leg records its tx hashes + CCTP message hash, so re-entry never
  double-swaps or double-deposits.
- The Polygon deposit reads the **actual** arrived USDC balance before depositing
  (never a remembered figure), so a partial arrival deposits what truly landed.

## Token selection & protections (automatic)
From the eligibility asset list (already network-tagged, with `isUsdc`):
- **Include** tokens on supported EVM chains whose USD value ≥ **floor** (default
  `$5`, configurable) and that the aggregator can route to USDC.
- **USDC** needs no swap: bridge-only if off-Polygon; direct deposit if on-Polygon.
- **Native gas token** (ETH/MATIC): may be swapped, but **reserve** a gas buffer
  (default keep `$3`-equiv or a fixed `minNativeWei`) so subsequent txs on that
  chain don't fail. Never swap the whole native balance.
- **Slippage**: default `0.5%` for stables, `1.0%` for volatile; routes revert if
  exceeded (no MEV-exposed unbounded slippage).
- Dropped/skipped tokens are surfaced to the user ("3 small balances skipped —
  gas would cost more than they're worth"), never silently ignored.

## Approvals (bounded — Permit2 single-use)
- Per swap, request a **Permit2** signature for the **exact** input amount with a
  short expiry, targeting the aggregator's Permit2 spender. One signature, no
  separate approve tx, bounded + expiring.
- Fallback for tokens/wallets without Permit2 support: `approve(spender,
  exactAmount)` for that swap only.
- The deposit leg keeps the existing EIP-2612 USDC permit (`buildPermitTypedData`).

## Credit math integration
No change to `summarizeEligibility`. The `CreditRing` already shows
`potentialCreditUsd` (80% of all value) vs `readyCreditUsd` (80% of USDC). As each
chain's leg completes and USDC lands + deposits, "ready" rises toward "potential"
— the zap **literally fills the ring**. Deposit amount keeps the existing 80%
provisioning rule applied to the arrived USDC.

## Error handling & edge cases
- **Route unavailable** for a token → skip it, tell the user, continue others.
- **Swap reverts / slippage** → leg `error`; offer retry (re-quotes).
- **Bridge stuck / attestation delayed** → stay in `bridging`, show elapsed time;
  retryable; never blocks other already-arrived legs from depositing.
- **User closes tab mid-bridge** → resume on return (persistence).
- **Insufficient native for gas** on a source chain → block that chain's swap with
  a clear message before signing.
- **Wrong network** → prompt switch (existing `useSwitchChain` pattern).
- **Dust-only wallet** (everything below floor) → explain nothing is convertible.

## Testing
- `plan.ts`: floor filtering, gas-reserve math, USDC-no-swap classification,
  native-reserve, per-chain grouping — pure unit tests (Vitest).
- `machine.ts`: every transition, error+resume from each leg, idempotency guards.
- `persistence.ts`: round-trip serialize/restore, SSR-safe (no `window`).
- `lifi.ts`: mocked SDK — quote shape, bounded-approval request (assert never
  requests unlimited), status polling.
- `useZapDeposit.ts`: orchestration happy path + one failed-leg-resume path
  (mocked wallet/public clients), mirroring the existing `useCardApproval` test
  style.

## Open questions for review
1. Provider: **LI.FI** (recommended) vs Socket/Bungee — ok to commit to LI.FI?
2. Default floor (`$5`) and native gas reserve — acceptable starting values?
3. v1 processes chains **sequentially** (simplest, clearest UX). Parallel across
   chains is possible later. OK to start sequential?
4. Confirm Solana and Approach B are **Phase 2** (out of this spec).
