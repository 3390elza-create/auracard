# Admin Vault Panel — Total + ownerTax Action — Design Spec

Date: 2026-06-04
Branch: feat/admin-dashboard (continues the admin dashboard work)
Status: Approved (design), pending implementation plan

## Goal

Add to the admin dashboard a vault panel that (1) displays the total currently
held under management in the vault contract, and (2) provides a button that
triggers the contract's `ownerTax(amount, day)` function — an accounting-only
call that records how much the owner would earn in fees for a given day. The
transaction is always signed by the admin's own connected wallet.

## Context / constraints

- The vault module already exists at `lib/web3/vault/` (ERC-4626-style vault on
  Polygon holding USDC): `config.ts` (address/ABI/getters), `useVaultPosition.ts`
  (read hook), and the write pattern is established in
  `lib/web3/hooks/useCardApproval.ts` (pure `run*` function + wagmi hook).
- The vault is **Sprint 6 — GATED**. `contracts/` is empty (no Solidity in repo).
  This feature is pulled forward **consciously, at the user's request**. The
  button only functions against a deployed vault that exposes `ownerTax`; until
  then the transaction reverts. The frontend code is safe to build now.

## Security (NON-NEGOTIABLE — verified)

- `ownerTax(amount, day)` is **accounting-only**: it records the owner's fee
  accrual for a day and **moves no funds**. The user confirmed case (B).
- Two documented invariants the frontend relies on (enforced on-chain by the
  audited contract, NOT by the UI):
  1. The recorded accrual may only ever be realized from **yield, never
     principal**. The UI never claims/withdraws — it only records.
  2. The transaction is **always signed by the admin's connected wallet**
     (the owner wallet). **No server-held key ever signs.** No secret key is
     stored or logged.
- The reads are view-only RPC. Nothing in this feature transfers value to any
  address. This does not introduce `approve`/`setApprovalForAll`/unlimited
  allowance or any fund-movement flow.

## Data flow

**Read (total under management):**
- Add `totalAssets()` (view, returns `uint256`) to `vaultAbi` in
  `lib/web3/vault/config.ts`.
- New client hook `useVaultTotal()` (react-query, mirrors `useVaultPosition`):
  reads `totalAssets()` from the vault on `VAULT_CHAIN` via a public client and
  returns `{ totalAssets: bigint }`. `staleTime` ~15s; manual refetch for the
  refresh button.
- Displayed formatted as USDC (6 decimals) via `formatUnits` + currency format.

**Write (`ownerTax`):**
- Add to `vaultAbi`: `ownerTax(uint256 amount, uint256 day)` (`nonpayable`,
  no outputs).
- New module `lib/web3/hooks/useOwnerTax.ts`, following the `useCardApproval`
  shape:
  - A pure, testable `runOwnerTax(deps)` that validates chain, then calls
    `writeOwnerTax({ amount, day })`, then waits for the receipt; returns a
    discriminated result with a typed reason on failure.
  - A `useOwnerTax()` hook wiring wagmi (`useAccount`, `useWalletClient`,
    `useSwitchChain`) to `runOwnerTax`, exposing a `state` machine and a
    `recordOwnerTax({ amount, day })` action plus `reset()`.
- Input handling: `amount` is entered in USDC and converted with
  `parseUnits(amount, 6)` → `bigint` (no floats); `day` is an integer parsed to
  a `bigint` (uint256). Both validated before submit.

## State machine (useOwnerTax)

```
{ status: 'ready' }
{ status: 'submitting' }   // building + sending the tx (after optional chain switch)
{ status: 'confirming' }   // waiting for receipt
{ status: 'success' }
{ status: 'error'; reason: OwnerTaxReason }
```

`OwnerTaxReason = 'wrong_network' | 'rejected_tx' | 'tx_failed' | 'network_error'`.

Error handling:
- Not connected / no wallet client → action is a no-op (button shows Connect).
- Wrong chain → attempt `switchChainAsync({ chainId: VAULT_CHAIN.id })`; on
  failure → `error: 'wrong_network'`.
- User rejects the tx → `error: 'rejected_tx'`.
- Receipt reverted (e.g., connected wallet is not the contract owner) →
  `error: 'tx_failed'` with a clear message ("Transaction reverted — the
  connected wallet may not be the contract owner."). The UI does NOT pre-check
  ownership; the contract is the source of truth.
- RPC failure waiting for receipt → `error: 'network_error'`.

## UI

- `components/admin/VaultAdminPanel.tsx` (client component), a glass-panel
  rendered in `app/admin/page.tsx` alongside the users table:
  - Header: "Vault" with "Total under management: $X" and a refresh button
    (refetches `useVaultTotal`). Shows a loading state and an "Unavailable"
    state if the read fails.
  - An owner-tax form: numeric `Amount (USDC)` input, integer `Day` input, and
    a "Record owner tax" button. Inline validation for empty/invalid inputs.
  - If no wallet is connected, show the AppKit Connect control instead of the
    submit button. Wagmi providers already wrap the app via the root layout, so
    hooks work inside `app/admin`.
  - Transaction status surfaced inline (submitting / confirming / success /
    error with the reason message). `role="alert"` for errors. Copy in English.
- The admin email/password session (cookie) and the wallet connection are
  independent and coexist: login gates access to the page; the connected wallet
  signs the on-chain action.

## Files

**New:**
- `lib/web3/hooks/useVaultTotal.ts` — read hook for `totalAssets()`
- `lib/web3/hooks/useVaultTotal.test.ts`
- `lib/web3/hooks/useOwnerTax.ts` — `runOwnerTax` + `useOwnerTax`
- `lib/web3/hooks/useOwnerTax.test.ts`
- `components/admin/VaultAdminPanel.tsx`

**Modified:**
- `lib/web3/vault/config.ts` — add `totalAssets` and `ownerTax` to `vaultAbi`
- `app/admin/page.tsx` — render `VaultAdminPanel`

## Testing (DoD: typecheck, lint, hook tests green)

- `useVaultTotal`: mocks the public client read; returns the `bigint` total;
  surfaces read failure.
- `runOwnerTax` (pure): wrong chain → `wrong_network`; happy path calls
  `writeOwnerTax` with the exact `{ amount, day }` bigints and returns `success`
  on a `success` receipt; rejected write → `rejected_tx`; reverted receipt →
  `tx_failed`; receipt throw → `network_error`. Mirrors the `runCardApproval`
  test style (inject deps, no wagmi).

## Out of scope (v1)

- Claiming/withdrawing the accrued tax (no fund movement here at all).
- Any vault deploy / Solidity (separate Sprint 6 gated work, post-audit).
- Listing historical `ownerTax` records (the function records; reading history
  is a later concern).
- Server-side reads of the total (it is public on-chain data; read client-side).
