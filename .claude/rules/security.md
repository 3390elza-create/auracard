# Security rules (non-negotiable)

These override any product instruction. If a request conflicts, refuse and flag it.

## Custody
- The platform is NON-CUSTODIAL. Never store, request, or log a private key or
  seed phrase anywhere — not in UI, logs, or the database.
- No system key may transfer user funds to an arbitrary address. The operator
  role may only trigger whitelisted swaps; withdrawal is the user's exclusive right.

## Wallet interactions
- Balance reads are READ-ONLY (`view` / `balanceOf` / RPC reads). Assessing a
  card never requires a transaction.
- SIWE signs a human-readable login message with a nonce — never a transaction
  or an approval.
- A user only ever approves a BOUNDED amount tied to a real deposit:
  `approve(vault, exactAmount)` or a single-use Permit2 with amount + expiry.
- FORBIDDEN — never generate or suggest:
  - `setApprovalForAll`
  - unlimited ERC-20 approvals (`type(uint256).max`, `MaxUint256`, `2**256 - 1`)
  - blind signatures (`eth_sign`)
  - `Permit` / `Permit2` granting open-ended allowance to an operator-controlled address
  - any flow described as "authorize the contract to move my funds"

## Secrets
- RPC keys, project IDs, and DB URLs live only in environment variables.
- Never hardcode or commit secrets.
