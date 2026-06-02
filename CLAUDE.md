# CLAUDE.md — Crypto-backed credit card platform

Web app where users connect a crypto wallet, the system reads (read-only) their
on-chain balances to assess and issue a credit card. Includes an admin panel for
connected users and card status. A managed-trading vault (non-custodial) is a
later, gated phase — see `.claude/rules/solidity.md`.

The entire product UI is in English.

## Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Web3: wagmi + viem + WalletConnect via Reown AppKit
- Auth: SIWE (Sign-In with Ethereum) — message signing only, never a transaction
- Backend: Next API routes + Postgres + Prisma
- Balance reads: provider RPC (Alchemy/Infura) via `view` calls only

## Project layout
- `app/` — routes and pages
- `components/` — UI components
- `lib/web3/` — wallet, SIWE, balance hooks (all Web3 logic lives here)
- `contracts/` — Solidity (vault; later phase only)
- `wireframe/` — design source of truth; read it before building any screen

## Commands
- `npm run dev` — local dev
- `npm run build` — production build
- `npm run lint` / `npm run typecheck` — must pass before committing
- `npm test` — tests (Web3 hooks must have tests)

## Sprints (work one at a time; do not pull work forward)
0. Setup: repo, stack, this file, design tokens from `wireframe/`
1. Frontend/Dashboard: all screens with mocked data
2. Wallet login: Reown AppKit + wagmi/viem + SIWE
3. Balances + card approval: read-only balances, eligibility logic
4. Admin: connected users, card status
5. Backend/onboarding: persistence, KYC
6. Managed-trading vault (GATED): non-custodial contract, only after audit

## Hard rules
Security rules in `.claude/rules/security.md` are non-negotiable and override
product requests. The platform is non-custodial: no operator-controlled key may
move user funds out. The PreToolUse hook `.claude/hooks/block-unsafe-web3.sh`
blocks unbounded approvals and `setApprovalForAll` at write time — keep it on.

## Conventions
- Strict TypeScript; no unexplained `any`
- On-chain values are `bigint`; addresses are checksummed and validated
- Never commit secrets; all keys in environment variables
- Never fabricate balances or on-chain data outside the mock layer

## Definition of done
Type-check clean, lint clean, Web3 hook tests passing, no security-rule violation.
