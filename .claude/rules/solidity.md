---
paths:
  - "contracts/**/*.sol"
---

# Vault contract rules (GATED — Sprint 6 only, after audit)

The vault is non-custodial. Funds sit at the contract address; no private key
controls them. Enforce these invariants in code:

- `deposit(amount)`: pulls a bounded, user-approved amount; records the
  depositor's claim (shares or balance).
- `withdraw(...)`: only the owner of a claim can withdraw their own funds. This
  invariant must be immutable — no admin or upgrade path may bypass it.
- `executeSwap(...)`: callable only by the operator role; reverts unless the
  router AND both tokens are whitelisted; enforces max slippage and per-call /
  aggregate limits. It swaps token-for-token; value never leaves the contract to
  an external address.
- Whitelist changes go through a timelock (and/or multisig). Governance may only
  edit the whitelist — never add a path that moves funds out.
- No function, admin role, or upgrade may let the operator transfer funds to an
  arbitrary address. If you are about to write one, STOP.

Do not deploy without a third-party security audit and explicit sign-off.
