# Card Approval Flow + Non-Custodial Vault — Design Spec

**Date:** 2026-06-02
**Status:** Approved in brainstorming — pending spec review before planning
**Sprint:** 6 (GATED vault phase), built **testnet-only** ahead of audit

> ⚠️ **GATE:** This is the gated vault phase. Everything here ships to **Base Sepolia
> (testnet) only**. No mainnet deployment until a third-party security audit and
> explicit sign-off, per `.claude/rules/solidity.md`.

---

## 1. Summary

Implement the "Request my Aura Card" flow. When an eligible user requests the card,
they sign a single EIP-2612 permit and submit one transaction that deposits an exact,
bounded amount of test USDC into a non-custodial vault and receives **$AURA** shares
1:1. Once the deposit confirms on-chain, the dashboard reveals a clearly-labelled
**demo** card (Luhn-valid number, valid future expiry, random-looking CVV) with a limit
equal to the deposited amount. The vault is non-custodial: redemption of the user's own
shares is the only path by which funds leave the contract.

## 2. Goals / Non-Goals

**Goals**
- Real, on-chain card-approval flow on Base Sepolia (no mocked dashboard data).
- Lowest-friction authorization: 1 signature (EIP-2612 permit) + 1 transaction.
- Deposit = 80% of the user's test-USDC balance; card limit = deposited amount.
- Card "active" state derived from on-chain $AURA balance (survives reload).
- Non-custodial guarantees enforced in contract code and covered by tests.

**Non-Goals (deferred / out of scope now)**
- Mainnet deployment (gated on audit).
- Timelocked migration to a successor vault ("option 2") — designed, **deferred** to a
  later phase; would require splitting $AURA into a standalone claim token.
- Operator role / managed swaps / whitelist / timelock governance.
- Real card issuer integration (Marqeta/Stripe Issuing) and any KYC.
- Multi-asset / multi-chain collateral; truly-random persisted CVV (needs backend).

## 3. Decisions (from brainstorming)

| # | Decision |
|---|---|
| Network | Base Sepolia (chainId **84532**), testnet-only |
| Collateral | **Test USDC** (`tUSDC`, 6 decimals, `ERC20Permit`, open `mint` faucet) |
| Vault | OpenZeppelin **ERC4626**; the vault token **is** the $AURA share |
| Share ratio | 1:1 (no yield → `convertToShares` is identity) |
| Deposit basis | 80% of the user's `tUSDC` balance |
| Card limit | = deposited amount (= 80% of balance), consistent with existing dashboard |
| Authorization | **EIP-2612 permit** (exact amount + deadline) consumed in `depositWithPermit` |
| Card reveal | On-chain: `$AURA > 0` ⇒ card active; demo card (Luhn-valid, future expiry, CVV) |
| Migration | **Deferred** (future extension, gated) |

## 4. Architecture

```
[ Dashboard ] --request--> useCardApproval
   reads $AURA balance        | 1. sign permit (EIP-2612: vault, exactAmount, deadline)   [signature]
   on Base Sepolia            | 2. depositWithPermit(amount, deadline, v,r,s)             [1 tx]
        ^                      v
        |                 [ AuraVault (ERC4626) ] -- pulls exact tUSDC, mints $AURA 1:1
        |                      |
        +-- $AURA > 0 ---------+ 3. tx confirmed ⇒ reveal demo card (limit = deposit)
```

**New units**
- `contracts/src/TestUSDC.sol` — faucet collateral token.
- `contracts/src/AuraVault.sol` — non-custodial ERC4626 vault; share token = $AURA.
- `lib/web3/vault/config.ts` — Base Sepolia addresses + ABIs (env-driven).
- `lib/web3/hooks/useCardApproval.ts` — orchestrates sign → deposit → confirm.
- `lib/web3/hooks/useVaultPosition.ts` — reads $AURA balance / deposited amount.
- `lib/card/generateDemoCard.ts` — pure demo-card generator.
- `components/dashboard/CardActivationPanel.tsx` — CTA + flow states.
- `CardVisualizer` update — reveals demo card data when active.

## 5. Smart contracts

### 5.1 `TestUSDC.sol` (testnet only)
- `ERC20` + `ERC20Permit`; name "Test USD Coin", symbol `tUSDC`, **6 decimals**.
- `mint(address to, uint256 amount)` — **open faucet** for demo funding.
- Header comment: `TESTNET ONLY — not for mainnet`.

### 5.2 `AuraVault.sol` — non-custodial vault
- Extends OpenZeppelin **`ERC4626`**. The vault token is **$AURA** (name "Aura Share",
  symbol `AURA`). `asset` (`tUSDC`) stored `immutable`.
- **`depositWithPermit(uint256 assets, uint256 deadline, uint8 v, bytes32 r, bytes32 s)`**
  → calls `asset.permit(msg.sender, address(this), assets, deadline, v, r, s)` then
  `deposit(assets, msg.sender)`. One signature + one tx. Amount is exact (no `max`).
- **`redeem` / `withdraw`** (inherited) — only the share holder can burn their own
  $AURA and receive `tUSDC`. No admin/owner can bypass this.
- **Deposit pause (only admin power):** a minimal `Ownable` `depositsPaused` flag.
  `deposit*` revert when paused; **`redeem`/`withdraw` are never affected** (exit always
  open). The owner can never move user funds. *(Optional — can be dropped in review.)*
- **No** operator role, **no** swaps, **no** upgradeability/proxy, **no** path that sends
  funds to an arbitrary address.

### 5.3 Invariants (mapped to `solidity.md`)
| Rule | Enforcement |
|---|---|
| `deposit` pulls bounded, user-approved amount | EIP-2612 permit, exact `assets` + `deadline`; never unlimited |
| `withdraw` only by claim owner; immutable | ERC4626 `redeem`/`withdraw` burn `msg.sender` shares only; no override |
| No role/upgrade moves funds to arbitrary address | No owner withdrawal, no proxy, no operator; pause cannot touch funds |
| Governance only edits whitelist (never moves funds) | N/A — no governance/whitelist in this MVP |

## 6. Frontend flow

### 6.1 Card state (derived on-chain, not mocked)
`useVaultPosition(address)` reads the user's `$AURA` balance and `convertToAssets`:
- `shares == 0` & has `tUSDC` → show **"Request my Aura Card"**.
- `shares == 0` & no `tUSDC` → show **"Mint test USDC"** faucet CTA first.
- `shares > 0` → **card active**; reveal demo card; limit = assets value of shares.

### 6.2 `useCardApproval` state machine
```
ready → signing → depositing → confirming → active
  └────────────── error(reason) ──────────────┘  (+ retry)
```
- **wrong_network:** if not on Base Sepolia → "Switch to Base Sepolia" (wagmi switch),
  flow blocked until switched.
- **rejected_signature / rejected_tx:** back to `ready`, friendly message.
- **insufficient_balance:** CTA becomes "Mint test USDC".
- **tx_failed / network_error:** error state + Retry. Card only reveals after confirmation.

### 6.3 Components
- `CardActivationPanel` holds the CTA and the loading/error states; `ApprovalStepper`
  reflects real progress (`approval` in_progress while signing/depositing → completed;
  `card_issued` completed when `$AURA > 0`).
- `CardVisualizer` flips to reveal demo data when active.
- All web3 logic in `lib/web3/`; components only consume hooks.

## 7. Demo card generation

Pure `generateDemoCard(address): { number, expiryMonth, expiryYear, cvv, holder }` in
`lib/card/`. Deterministic from `keccak256(address)` (stable across reloads, no backend):
- **Number:** test-BIN prefix + digits from the hash + Luhn check digit ⇒ passes Luhn.
  Not a real network BIN (does not impersonate Visa/Mastercard). Shown in groups of 4.
- **Expiry:** month `(hash % 12) + 1`; year `currentYear + 3..5` ⇒ always future.
- **CVV:** 3 digits from another hash slice — random-looking, stable. (Truly-random
  persisted CVV requires the Sprint 5 backend.)
- **Holder:** "GENESIS MEMBER". **Limit:** deposited amount.
- UI shows a visible **"DEMO"** badge + "Demonstration card — not a real payment instrument."

## 8. Networks & config
- Add **Base Sepolia (84532)** to `lib/web3/chains.ts`, wagmi/AppKit networks, and the
  balance-read config.
- Env: `NEXT_PUBLIC_VAULT_ADDRESS`, `NEXT_PUBLIC_TEST_USDC_ADDRESS`
  (+ `NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA`), documented in `.env.example`.

## 9. Testing

**Contracts (Foundry, `contracts/`)**
- `depositWithPermit` mints $AURA 1:1; rejects expired/!exact permit.
- `redeem`/`withdraw`: only owner withdraws; a third party cannot touch another's shares.
- Non-custody invariant: assert no path other than owner `redeem` removes assets.
- `depositsPaused` blocks deposits but **not** redeem.

**Frontend (vitest, mocked provider — as in Sprint 3)**
- `generateDemoCard`: Luhn-valid, future expiry, 3-digit CVV, deterministic per address.
- `useCardApproval`: state transitions, rejection handling, wrong-network guard.

## 10. Deploy & mainnet gate
- Foundry deploy script → Base Sepolia: `TestUSDC` → `AuraVault` (asset wired).
- Publish addresses to `.env.local` / `.env.example`.
- Contracts carry `TESTNET ONLY — not audited` headers. **No mainnet** until audit + sign-off.

## 11. Future extensions (deferred, gated)
- **Migration (option 2):** split $AURA into a standalone claim token; add timelocked,
  exit-windowed migration to a successor vault that honors the same shares; governance via
  multisig + timelock. Designed in brainstorming; not built now.
- Multi-asset / multi-chain collateral; real card issuer; persisted random CVV.

## 12. Definition of Done
`npm run typecheck / lint / build / test` green, `forge test` green, no security-rule
violation, card flow works end-to-end on Base Sepolia, card state derived on-chain.

## 13. Risks / open items
- **Balance basis (needs confirmation):** the Sprint 3 dashboard reads **mainnet**
  balances (ETH/WBTC/USDC across 4 mainnets), but the card flow deposits **Base Sepolia
  tUSDC**. To keep the demo coherent (so the "80%" the user sees matches what they
  deposit), the card-approval flow computes 80% from the user's **tUSDC balance on Base
  Sepolia**, and the dashboard's eligible-balance/limit panels reflect that tUSDC during
  the demo. Mainnet reads stay available but are not the deposit basis. *(Confirm in review.)*
- Public testnet RPC reliability (mitigated by configurable RPC).
- `depositsPaused` adds a minimal admin role — included for incident response; can be
  removed in review for a zero-admin vault.
- Demo card realism vs. not impersonating a card network — resolved via test-BIN + "DEMO".
