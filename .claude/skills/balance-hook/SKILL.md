---
name: balance-hook
description: Add a read-only on-chain balance hook for card eligibility. Use when the dashboard or approval logic needs a user's token balances. Never sends a transaction.
---

# Read-only balance hook

Add a hook in `lib/web3/` that reads a connected wallet's token balances for
card-eligibility assessment.

Rules:
- READ-ONLY. Use the provider RPC client and `balanceOf` / multicall `view`
  reads. Never request or send a transaction.
- Return balances as `bigint`; format for display separately.
- Validate and checksum the address; handle the not-connected state.
- Cache/debounce reads; handle RPC errors with a clear fallback.

Steps:
1. Add `useTokenBalances(address, tokens)` in `lib/web3/`.
2. Source the token list from config (whitelisted assets for eligibility).
3. Expose loading/error states.
4. Write a test with a mocked provider.
5. Wire it into the eligibility logic (Sprint 3), not the mock dashboard.
