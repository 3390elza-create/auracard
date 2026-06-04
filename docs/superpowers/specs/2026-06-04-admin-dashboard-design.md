# Admin Dashboard — Design Spec

Date: 2026-06-04
Sprint: 4 (Admin) + minimal Sprint 5 persistence pulled forward
Status: Approved (design), pending implementation plan

## Goal

An admin-only dashboard that lists every wallet that has signed in (each
connected wallet = one "user"), showing its connected wallet address, on-chain
USD value (live, read-only), and card status. Admins authenticate with email +
password (separate from the SIWE wallet auth used by end users).

## Context / constraints

- End users authenticate via **SIWE** (wallet signature) — they have **no
  email**. Therefore "user" in the admin list is identified by wallet address.
- No database exists yet (persistence was Sprint 5). This spec stands up a
  minimal Prisma + Postgres layer now.
- Security rules (`.claude/rules/security.md`) are non-negotiable: non-custodial,
  read-only balance reads, no system key moves funds, no secrets committed.
- Visual system / tokens follow `.claude/rules/frontend.md` and existing
  glass-panel components. All UI copy in English.

## Chosen approach (A)

Own admin session (no NextAuth). Prisma + Postgres. `User` upserted on SIWE
verify. `Admin` table seeded by a script, password hashed with `bcryptjs`.
Separate signed-JWT admin session cookie mirroring the existing
`lib/web3/server/session.ts` pattern. Admin pages under `app/admin`, guarded
server-side. `/api/admin/users` performs on-chain reads server-side and returns
totals — wallet balances never reach the client.

Rejected: (B) NextAuth/Auth.js — heavy, clashes with the custom SIWE session.
(C) client-side balance reads — exposes all user wallets to the browser, slower.

## Data model (Prisma)

```prisma
enum CardStatus {
  pending
  active
  suspended
}

model User {
  id            String     @id @default(cuid())
  walletAddress String     @unique   // EIP-55 checksummed
  chainId       Int
  cardStatus    CardStatus @default(pending)
  firstSeenAt   DateTime   @default(now())
  lastLoginAt   DateTime   @updatedAt
}

model Admin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

- `User` upsert by `walletAddress` happens at the end of `POST /api/auth/verify`,
  only after the SIWE signature is verified. Create on first sight, update
  `lastLoginAt`/`chainId` on return.

## Admin authentication

- Hashing: `bcryptjs` (pure JS — no native build issues on Windows). Constant-time
  comparison via `bcrypt.compare`. Password is never logged or returned.
- Session: cookie `admin_session`, signed JWT, `httpOnly`, `secure` in production,
  `sameSite: 'lax'`, `path: '/'`. Dedicated secret `ADMIN_SESSION_SECRET`.
  Claim shape `{ adminId, email, role: 'admin' }`. TTL reuses the existing
  session TTL env or a dedicated one.
- Util: `lib/admin/server/session.ts` (`signAdminSession` / `verifyAdminSession`),
  mirroring `lib/web3/server/session.ts`.
- Routes:
  - `POST /api/admin/login` — body `{ email, password }`; look up `Admin` by
    email; `bcrypt.compare`; on success set `admin_session` cookie. Generic
    error on failure (no email-enumeration leak).
  - `POST /api/admin/logout` — clears the cookie.
  - `GET /api/admin/me` — returns `{ email }` if a valid admin session, else 401.
- Seed: `scripts/seed-admin.ts` run via `npm run seed:admin`. Reads
  `ADMIN_EMAIL` + `ADMIN_PASSWORD` from env (or prompts), hashes, upserts the
  `Admin` row. No public signup.

## Screens

- `app/admin/login/page.tsx` — email/password form using glass-panel components
  and existing design tokens. Labelled inputs, keyboard navigable, clear error
  state on bad credentials.
- `app/admin/page.tsx` — server-guarded (no valid admin session → redirect to
  `/admin/login`). Read-only table:
  - Columns: wallet address (truncated, checksummed, copy affordance), chain,
    first seen, last login, **live USD value**, card status badge, and a
    **"Claim" button (mock, no-op)**.
  - The "Claim" button is UI-only: it triggers no on-chain write and no state
    change. (May show a "coming soon"/disabled affordance.)
  - Loading and error states explicit while balances resolve.

## Data / on-chain reads

- `GET /api/admin/users` (admin-only; 401 without a valid admin session):
  1. Read `User[]` from Postgres via Prisma.
  2. For each wallet, reuse `lib/web3/balances/readBalances` + `prices` to sum
     USD value. Use multicall/batching to limit RPC round-trips.
  3. Return `[{ walletAddress, chainId, cardStatus, firstSeenAt, lastLoginAt,
     totalUsd }]`.
- All amounts handled as `bigint` until display formatting.
- No pagination in v1. If the user count grows large enough to strain RPC, log a
  visible limit notice rather than silently truncating.

## Security

- All on-chain access is read-only; the admin role never moves funds. The
  "Claim" button performs no on-chain action.
- `DATABASE_URL`, `ADMIN_SESSION_SECRET`, RPC keys live only in env vars; nothing
  hardcoded or committed.
- Admin endpoints reject requests without a valid `admin_session`.
- Passwords stored only as bcrypt hashes; never logged, never returned by any API.

## Testing (Definition of Done: typecheck, lint, hook tests green)

- `lib/admin/server/session` — sign/verify round-trip, tamper rejection, expiry.
- bcrypt hash/verify helper — hashes, verifies, rejects wrong password.
- `POST /api/admin/login` — success path, wrong password, unknown email (generic
  error, no enumeration).
- `GET /api/admin/users` — 401 without session; with session returns rows with
  totals (Prisma mocked, balance reader mocked).
- SIWE `verify` upsert — new wallet creates a `User`; returning wallet updates
  `lastLoginAt`.

## Out of scope (v1)

- User detail page, search/filter/sort, pagination.
- Changing card status from the admin UI (read-only for now).
- Multiple wallets per user (each wallet is its own row).
- Real "Claim" behavior.
