# Gasless, non-custodial card vault

**Date:** 2026-06-07
**Status:** Approved design — ready for implementation plan

## Problem

Two things are wrong with the current production vault (`AuraVault` at
`0xD5bc33Df93749070548cCab147916eB12FeCe5FB`, Polygon):

1. **It is not non-custodial.** Bytecode inspection shows the deployed contract
   has `ownerDepositBack(uint256)` and emits an `OwnerWithdraw(address,uint256)`
   event — i.e. an owner-controlled path that moves user funds out of the vault.
   This violates `.claude/rules/security.md` / `solidity.md` ("no system key may
   transfer user funds to an arbitrary address") and is exactly what the wallet's
   Blockaid screen flagged ("a third party … might take all your assets"). The
   source snippet circulated does NOT match the deployment (it lacks these).
2. **Users must hold native gas.** Funding the card requires on-chain txs
   (approve + deposit), so a user holding only USDC and no POL/ETH cannot fund —
   they hit cryptic failures (see the `insufficient_gas` pre-flight already
   shipped). We want a gasless path: the user signs once, no native token needed.

The deployed vault has **zero deposits** (`totalSupply` = `totalAssets` = 0 — no
deposit ever succeeded), so replacing it requires **no migration**.

## Goal

Deploy a single new vault contract that is (a) strictly non-custodial — no
owner/operator path can move user funds — and (b) supports a gasless deposit so a
user with only USDC on Polygon can fund the card with one signature and no native
gas.

## Decisions (from brainstorming)

1. **Single new contract**, replacing the empty vault. No migration. The app
   re-points `NEXT_PUBLIC_VAULT_ADDRESS` at it.
2. **No owner fund-movement, at all.** No `ownerWithdraw`, no `ownerDepositBack`,
   no rescue/sweep/emergency path — none. (The managed-trading / operator-swap
   model in `solidity.md` is a SEPARATE, later, gated contract — not this card
   vault.)
3. **Gasless via permit + sponsored relay.** EIP-2612 permit (gasless signature)
   + a managed relay (**Gelato `sponsoredCall`**) that submits the tx; the
   operator **sponsors 100% of gas** (cheap on Polygon).
4. **Polygon-only gasless.** The vault and gasless path live on Polygon. Assets
   on other chains still need source-chain gas to bridge (inherent; already
   surfaced by the `insufficient_gas` pre-flight notice).
5. **Audit-gated.** Build + test on **Polygon Amoy** testnet now; mainnet deploy
   only after a third-party audit (project rule). Until then, the shipped
   approve + deposit path remains production.

## Architecture

### 1. The vault contract — `contracts/AuraVault.sol` (Polygon, audit-gated)

A pure non-custodial ERC-4626 over native USDC (`0x3c49…3359`), built on
OpenZeppelin ERC4626. It keeps the standard surface (`deposit`, `mint`,
`withdraw`, `redeem`, `convertToAssets`, `totalAssets`, `balanceOf`, `asset`) and
adds ONE entry point for gasless deposits:

```solidity
/// Gasless deposit. Anyone (a relayer) may submit, but the funds pulled and the
/// shares minted are bound to `owner` by the owner's own EIP-2612 signature.
/// msg.sender is irrelevant — it cannot redirect funds or shares.
function depositWithPermit(
    uint256 assets,
    address owner,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external returns (uint256 shares) {
    // Front-running-safe: a griefer could pre-submit the permit and consume the
    // nonce; only require the signature if the allowance isn't already set.
    if (IERC20(asset()).allowance(owner, address(this)) < assets) {
        IERC20Permit(asset()).permit(owner, address(this), assets, deadline, v, r, s);
    }
    shares = previewDeposit(assets);
    _deposit(owner, owner, assets, shares); // pull from `owner`, mint to `owner`
}
```

**Non-custodial invariants (enforced + audited):**
- The `owner` (permit signer) is ALWAYS both the payer and the share recipient.
  `msg.sender`/relayer can never divert funds or shares.
- Approval is the **exact** permit amount — never unlimited.
- `withdraw`/`redeem` follow the ERC-4626 standard: only a share holder (or an
  address they approved) can withdraw their own funds. No admin bypass.
- **No function, role, or upgrade may move user funds to an arbitrary address.**
  The contract is **not** `Ownable` and has **no** owner/operator/rescue/sweep
  functions. It is non-upgradeable (no proxy) so the withdraw invariant is
  immutable.
- First-deposit inflation/donation attack mitigated via OpenZeppelin's
  `_decimalsOffset()` (virtual shares) — audit to confirm the chosen offset.
- `SafeERC20` for all token movement.

`contracts/` currently has no Solidity toolchain — **Foundry** is added with this
work (`forge` for build/test, deploy scripts).

### 2. Relay — `app/api/relay/deposit/route.ts` + Gelato

- The frontend signs the permit and POSTs `{ owner, assets, deadline, v, r, s }`.
- The route runs server-side, holds `GELATO_API_KEY`, validates the payload
  (checksum `owner`, `assets > 0`, sane `deadline`, **`owner === session.address`**
  from the SIWE session), builds `vault.depositWithPermit(...)` calldata, and
  calls Gelato `sponsoredCall({ chainId: 137, target: VAULT, data }, key)`.
  Returns the `taskId`.
- **Status** is polled client-side via Gelato's public task-status API by
  `taskId` (not secret); only the sponsor key is server-held.
- **Anti-abuse of sponsored gas:** the route is **gated by the SIWE session**
  (only a logged-in wallet, only for its own address), **rate-limited**, and
  enforces a **minimum deposit** (don't sponsor dust) so the gas balance can't be
  drained by spam.
- Sponsorship: Gelato 1Balance funded by the operator.

### 3. Frontend — `lib/web3/hooks/useGaslessDeposit.ts` + modal wiring

- `useGaslessDeposit(address)`: read USDC `name`/`nonce` → build EIP-2612 permit
  typed data (`owner`, `spender = vault`, `value = assets`, `nonce`, `deadline`,
  `chainId 137`, `verifyingContract = USDC`, version from config) → **one
  `signTypedData`** (gasless) → POST to the relay route → poll task status →
  invalidate `['vaultPosition', address]`. States: `signing → relaying →
  confirming → active → error`.
- `CardRequestModal`: the direct Polygon-USDC deposit (`action === 'convert' &&
  !canZap`) uses `useGaslessDeposit` (the zero-POL case). The existing
  approve + deposit stays for the zap's final deposit and as a **fallback** if
  the relay errors.

## Migration / rollout

No migration (empty vault). Deploy the new vault → set `NEXT_PUBLIC_VAULT_ADDRESS`
to it → the deprecated vault is abandoned (it holds nothing). The standard
`deposit(assets, receiver)` on the new vault keeps the current approve + deposit
path working for users who have POL.

## Security

- **The headline fix:** the new vault has zero owner/operator fund-movement —
  removing the Blockaid-flagged drain path. Verify post-deploy that the bytecode
  exposes no `ownerWithdraw`/`ownerDepositBack`/rescue selectors.
- Permit bounded exact; relay only ever targets the vault's `depositWithPermit`;
  relay route session-gated + rate-limited + min-deposit.
- Non-upgradeable; withdraw is the share holder's exclusive right.
- **Third-party audit required before mainnet** (project rule).

## Testing

- **Contract (Foundry):** `depositWithPermit` credits the permit signer; reverts
  on bad/expired permit; is **not diverted** by a different `msg.sender`; pulls
  the exact amount; permit front-run (nonce pre-consumed) still deposits via the
  allowance check; standard ERC-4626 deposit/withdraw/redeem; first-deposit
  inflation attack is mitigated; **no owner/drain function exists**.
- **Frontend:** permit typed-data construction (reuse `buildPermitTypedData`); a
  `useGaslessDeposit` flow test with a mocked relay.
- **Relay route:** validation (session match, min amount, target = vault).
- **E2E on Polygon Amoy:** deploy → sign → relay → shares minted, with a wallet
  holding zero native gas.

## Definition of done

Contract + Foundry tests green on testnet; relay route + `useGaslessDeposit`
type-check / lint / unit tests green; end-to-end gasless deposit demonstrated on
Amoy with a zero-gas wallet; security invariants verified. Mainnet remains gated
on a third-party audit.
