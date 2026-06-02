---
paths:
  - "lib/web3/**/*.{ts,tsx}"
  - "app/**/*.{ts,tsx}"
---

# Web3 rules

- Use wagmi + viem. Connect wallets with Reown AppKit (WalletConnect). Do not
  hand-roll provider wiring.
- All Web3 logic lives in `lib/web3/`. Components consume it via hooks; no raw
  contract calls inside components.
- Authentication is SIWE: build the message with a server-issued nonce, verify
  the signature server-side, issue a session. Signing proves possession only.
- Treat all on-chain amounts as `bigint`. Never use floats for token values.
- Validate and checksum every address before use.
- Reads use a provider RPC client; never require the user to send a transaction
  to read balances.
- Handle wallet rejections and chain mismatches explicitly; surface clear errors.
