# Sprint 2 — Wallet login (Reown AppKit + wagmi + SIWE)

**Date:** 2026-06-02
**Scope:** Sprint 2 — make `/connect` a real wallet-login flow, persist a
SIWE session in an HttpOnly JWT cookie, gate `/dashboard` behind that
session, and replace every wallet-related mock with live data. Real
on-chain balance reads (Sprint 3), admin (Sprint 4), KYC + DB (Sprint 5),
and vault contracts (Sprint 6) remain explicitly out of scope.
**Author:** Brainstorming session, approved by product owner.

---

## 1. Goals & constraints

### Goals

1. Wire **Reown AppKit + wagmi + viem** so any of the four `WalletPicker`
   buttons opens the AppKit modal, which then handles the actual wallet
   selection (extension detection, WalletConnect QR, deep links). The
   custom buttons are entry points to the same modal — the "Recommended"
   badge on WalletConnect is a hint, not a filter.
2. Implement **Sign-In with Ethereum (ERC-4361)** end-to-end:
   client-issued nonce request → server-issued nonce → wallet signature →
   server-side verification → JWT session cookie.
3. Protect `/dashboard` with Next.js middleware that verifies the JWT;
   unauthenticated requests redirect to `/connect?redirectTo=<original>`.
4. Replace every wallet-related mock in Sprint 1 components. After Sprint 2,
   no part of the codebase fabricates a wallet address, chain ID, or
   short-form display.
5. Make `npm test` non-trivial — meaningful unit + route tests cover
   session/nonce/SIWE/verify so `CLAUDE.md`'s "Web3 hook tests" rule is met.

### Hard constraints (from `CLAUDE.md` + `.claude/rules/`)

- **Non-custodial.** SIWE is a signature, never a transaction. No private
  key, seed phrase, unbounded approval, `setApprovalForAll`, `MaxUint256`,
  blind `eth_sign`, or operator-controlled approval anywhere.
- **`lib/web3/` owns Web3.** Components stay presentational; no raw
  `wagmi`/`viem` import inside `components/**` — only via hooks under
  `lib/web3/hooks/`.
- **bigint for on-chain amounts.** No floats. (Sprint 2 does not read
  balances, but the type discipline is established.)
- **Addresses are checksummed and validated** at every boundary.
- **Secrets in env.** Never hardcoded. `.env.local` ignored;
  `.env.example` committed with placeholders.
- **`.claude/hooks/block-unsafe-web3.sh` stays enabled and untouched.**
- **English-only UI.** Error copy in English.

### Product decisions resolved during brainstorming

| Question | Decision |
|---|---|
| Chains | **Ethereum mainnet only.** chainId = 1. Multi-chain UX deferred. |
| RPC provider | **Alchemy.** URL in `NEXT_PUBLIC_RPC_URL`. |
| Session storage | **JWT (HS256) in HttpOnly cookie.** 7-day TTL. DB-backed sessions deferred to Sprint 5. |
| Wallet-picker UI | **Keep custom buttons**, open the AppKit modal on click. |
| Routing | **Middleware-protected `/dashboard`.** Unauthenticated → `/connect?redirectTo=/dashboard`. Login → `redirectTo` (default `/dashboard`). |
| Mocks | **Wallet section becomes 100% real.** `useWalletMock`, `MOCK_WALLET`, and the `wallet` field on `DashboardData` are deleted. Balances/limit/timeline stay mocked until Sprint 3. |
| Logout | Replaces the temporary "Settings" item in Sidebar/MobileTabBar. Real Settings returns in Sprint 4. |

---

## 2. Architecture

Three layers, with sharp boundaries.

### 2.1 Client (browser)

- `lib/web3/wagmi.ts` — `createConfig({ chains: [mainnet], transports: { 1: http(RPC) }, connectors })`.
- `lib/web3/appkit.ts` — `createAppKit({ projectId, networks: [mainnet], metadata, themeMode: 'dark', themeVariables })`.
- `lib/web3/providers.tsx` — `'use client'` wrapper with `<WagmiProvider>` + `<QueryClientProvider>`. Mounted once at the root layout.
- `lib/web3/hooks/`:
  - `useSession()` — fetches `/api/auth/me` once on mount; exposes
    `{ status: 'loading'|'unauthenticated'|'authenticated', address?, chainId? }`.
    Cached via `react-query`'s `useQuery(['session'])`.
  - `useSiweLogin()` — the orchestrator. Exposes `{ state, start(walletId), reset() }`
    where `state: SiweLoginState` (see §3.4).
  - `useDisconnect()` — calls `/api/auth/logout`, invalidates the session
    query, and calls wagmi's `disconnect()`.

### 2.2 Server (Node runtime — Next.js API routes)

- `lib/web3/server/session.ts` — `signSession({ address, chainId })` and
  `verifySession(token)`. Uses `jose` HS256 with `SESSION_SECRET`. TTL
  configured via `SESSION_TTL_SECONDS` (default `604800`).
- `lib/web3/server/nonce.ts` — `issueNonce(address)` returns
  `{ nonce, cookieValue }`; `consumeNonce(req, expected)` reads the
  `siwe_nonce` cookie, verifies it, returns the nonce or throws a typed
  error.
- `lib/web3/server/getSession.ts` — RSC helper. Reads the cookie via
  `next/headers`, calls `verifySession`, returns `SessionClaims | null`.
- `app/api/auth/{nonce,verify,me,logout}/route.ts` — endpoints described
  in §3.

### 2.3 Edge (middleware)

- `middleware.ts` — runs on the Edge runtime. Verifies the `session`
  cookie via `jose` (Edge-compatible). Matches `/dashboard/:path*`.
  Redirects to `/connect?redirectTo=<original>` when invalid/missing.

### 2.4 End-to-end SIWE flow

```
[/connect] click wallet
   │
   ▼
useSiweLogin.start(id)
   │  state=connecting
   ▼
appKit.open()  →  user picks wallet in modal  →  wagmi useAccount.address populated
   │  state=requesting_nonce
   ▼
POST /api/auth/nonce { address }
   │  ← 200 { nonce } + Set-Cookie siwe_nonce (5 min, signed by NONCE_SECRET)
   ▼
build SIWE message via lib/web3/siwe.ts
   │  state=awaiting_signature
   ▼
walletClient.signMessage(message)
   │  state=verifying
   ▼
POST /api/auth/verify { message, signature }
   │  server: parse SIWE, consume nonce cookie, viem.verifyMessage,
   │          sign session JWT, set cookie session (7d), clear siwe_nonce
   │  ← 200 { address, chainId }
   ▼
router.push(redirectTo ?? '/dashboard')
   │
   ▼
[/dashboard] middleware verifies session → renders with useSession()
```

---

## 3. API contracts

All requests/responses JSON. Bodies validated with `zod`. Errors return
`{ error: string }` with the codes listed. No PII, secrets, or signatures
ever appear in error responses.

### 3.1 `POST /api/auth/nonce`

**Request**

```ts
{ address: `0x${string}` }
```

**Response 200**

```ts
{ nonce: string }   // 32 hex chars (16 random bytes)
// Set-Cookie: siwe_nonce=<signed-jwt-like blob>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300
```

The cookie payload (HS256 with `NONCE_SECRET`):
`{ nonce, address: checksummed, iat, exp: iat + 300 }`.

**Errors**

- 400 `{ error: 'invalid_address' }`
- 429 `{ error: 'rate_limited' }` (in-process limiter, 10/min/IP; Sprint 5 promotes to Redis)

### 3.2 `POST /api/auth/verify`

**Request**

```ts
{
  message: string,                // exact ERC-4361 string the wallet signed
  signature: `0x${string}`,
}
```

**Server logic**

1. Read `siwe_nonce` cookie. If missing/expired/tampered → typed error.
2. Parse `message` via `viem-siwe`'s `parseSiweMessage`.
3. Assert all of:
   - `message.nonce === cookie.nonce`
   - `getAddress(message.address) === cookie.address`
   - `message.chainId === 1`
   - `message.domain === request host`
   - `message.uri.origin === request origin`
   - `message.issuedAt` within ±10 minutes of now
4. `viem.verifyMessage({ address: cookie.address, message, signature })` → must return true.
5. Sign session JWT, set `session` cookie (7d), clear `siwe_nonce` cookie.

**Response 200**

```ts
{ address: `0x${string}`, chainId: 1 }
// Set-Cookie: session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
// Set-Cookie: siwe_nonce=; Max-Age=0
```

**Errors**

- 400: `invalid_body | invalid_siwe_message | nonce_mismatch | address_mismatch | chain_mismatch | domain_mismatch | issued_at_skew`
- 401: `signature_invalid`
- 410: `nonce_expired` (cookie absent or past `exp`)

### 3.3 `GET /api/auth/me`

```ts
// 200
{ address: `0x${string}`, chainId: number }
// 401 — no body
```

Verifies the `session` cookie. Does not refresh it.

### 3.4 `POST /api/auth/logout`

```ts
// 204 No Content
// Set-Cookie: session=; Max-Age=0
```

Idempotent.

### 3.5 Shared types (`lib/web3/types.ts` — new)

```ts
import type { Address } from '@/lib/mock/types'

export interface SessionClaims {
  address: Address
  chainId: number
  iat: number
  exp: number
}

export interface SiweMessageArgs {
  domain: string
  address: Address
  uri: string
  chainId: number
  nonce: string
  issuedAt: string  // ISO 8601
  statement?: string
}

export type SiweLoginState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'requesting_nonce' }
  | { status: 'awaiting_signature' }
  | { status: 'verifying' }
  | { status: 'success'; address: Address }
  | { status: 'error'; error: SiweLoginError }

export type SiweLoginError =
  | 'user_rejected_connect'
  | 'user_rejected_signature'
  | 'wrong_chain'
  | 'nonce_failed'
  | 'verify_failed'
  | 'network_error'

export type SessionState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; address: Address; chainId: number }
```

---

## 4. File layout

### 4.1 Net-new

```
lib/
└── web3/
    ├── chains.ts                 # readonly [mainnet]; CHAIN_ID = 1
    ├── env.ts                    # readPublicEnv / readServerEnv, zod-validated
    ├── wagmi.ts                  # createConfig
    ├── appkit.ts                 # createAppKit + theme
    ├── providers.tsx             # 'use client' provider boundary
    ├── siwe.ts                   # buildSiweMessage / parseSiweMessage thin wrapper
    ├── types.ts                  # SessionClaims, SiweLoginState, SiweLoginError, SessionState
    ├── hooks/
    │   ├── useSession.ts
    │   ├── useSiweLogin.ts
    │   └── useDisconnect.ts
    └── server/
        ├── session.ts            # signSession / verifySession (jose, HS256)
        ├── nonce.ts              # issueNonce / consumeNonce
        └── getSession.ts         # RSC helper

app/
└── api/
    └── auth/
        ├── nonce/route.ts
        ├── verify/route.ts
        ├── me/route.ts
        └── logout/route.ts

middleware.ts                     # /dashboard guard

.env.example                      # placeholders + comments
```

### 4.2 Edited

- `app/layout.tsx` — wrap with `<Web3Providers>`.
- `app/connect/page.tsx` — read `searchParams.redirectTo`; pass to `<WalletPicker>`.
- `components/connect/WalletPicker.tsx` — replace `console.info` stub with `useSiweLogin().start(id)`; render loading + error states.
- `components/layout/Sidebar.tsx` — add Disconnect button (lucide `LogOut`) wired to `useDisconnect()`.
- `components/layout/MobileTabBar.tsx` — replace the "Settings" item with "Disconnect" (same icon + handler).
- `app/dashboard/page.tsx` — `useSession()` instead of `useWalletMock()`; build the `wallet` prop from session.
- `lib/mock/types.ts` — drop `wallet` from `DashboardData`; drop `WalletSession` (moves to `lib/web3/types.ts` as a derived shape — see §5).
- `lib/mock/data.ts` — remove `MOCK_WALLET` and `MOCK_DASHBOARD.wallet`.
- `lib/mock/hooks.ts` — remove `useWalletMock()`.

### 4.3 Untouched but worth naming

- `tailwind.config.ts`, `globals.css`, all UI primitives, all landing
  components, all dashboard panels — no changes. Sprint 2 is an auth +
  data-flow change, not a visual change.

---

## 5. `WalletSession` lives in `lib/web3/types.ts`

Sprint 1 placed `WalletSession` in `lib/mock/types.ts` because the mock
owned it. Sprint 2 promotes it: real session, real type.

```ts
// lib/web3/types.ts (additional export)
export interface WalletSession {
  address: Address
  addressShort: string  // truncateAddress(address)
  chainId: number
  chainName: string     // 'Ethereum' for chainId 1
}
```

`Sidebar` and `DashboardHeader` import `WalletSession` from
`@/lib/web3/types` instead of `@/lib/mock/types`. The shape is
identical — only the source moves.

The `wallet` field disappears from `DashboardData`. Pages compose:

```tsx
const session = useSession()
const mock = useDashboardMock()
if (session.status !== 'authenticated') return null
const wallet: WalletSession = {
  address: session.address,
  addressShort: truncateAddress(session.address),
  chainId: session.chainId,
  chainName: 'Ethereum',
}
```

---

## 6. Error handling — exhaustive map

| Where | Trigger | Surfaced as |
|---|---|---|
| `useSiweLogin.start()` | AppKit modal closed | `state.error = 'user_rejected_connect'` |
| `useSiweLogin.start()` | wallet `signMessage` rejected | `state.error = 'user_rejected_signature'` |
| `useSiweLogin.start()` | `useAccount.chainId !== 1` | `state.error = 'wrong_chain'`; tries `switchChain` once before reporting |
| `useSiweLogin.start()` | `/api/auth/nonce` non-200 | `state.error = 'nonce_failed'` |
| `useSiweLogin.start()` | `/api/auth/verify` non-200 | `state.error = 'verify_failed'` |
| `useSiweLogin.start()` | `fetch` rejects (offline) | `state.error = 'network_error'` |
| `/api/auth/nonce` route | zod validation fails | 400 `invalid_address` |
| `/api/auth/verify` route | `siwe_nonce` cookie missing/expired | 410 `nonce_expired` |
| `/api/auth/verify` route | parse/assert step fails | 400 with the matching code |
| `/api/auth/verify` route | `viem.verifyMessage` false | 401 `signature_invalid` |
| `middleware.ts` | JWT missing/invalid/expired | redirect to `/connect?redirectTo=<original>` |
| `/api/auth/me` route | JWT invalid | 401 (no body); `useSession()` surfaces `unauthenticated` |
| wagmi `accountChanged` event | user switches wallet in extension | hook listener resets `useSiweLogin` to `idle` and triggers `useDisconnect()` (no auto re-login) |
| wagmi `disconnect` event | wallet disconnects mid-session | same as above |

UI copy mapping (English, in `components/connect/WalletPicker.tsx`):

- `user_rejected_connect` → "Connection cancelled. Try again when you're ready."
- `user_rejected_signature` → "Sign-in cancelled. We need the signature to log you in."
- `wrong_chain` → "Switch to Ethereum mainnet and try again."
- `nonce_failed` → "Could not start sign-in. Try again."
- `verify_failed` → "Sign-in failed. Try again."
- `network_error` → "Network error. Check your connection and try again."

No `try/catch` silently swallowing errors. Server logs use the prefix
`[auth]` and never include `signature`, `nonce`, `cookie`, or
`Authorization`.

---

## 7. Environment

`.env.example` (committed):

```
# Reown Cloud project ID — https://cloud.reown.com
NEXT_PUBLIC_WC_PROJECT_ID=

# Ethereum mainnet RPC — Alchemy
# https://eth-mainnet.g.alchemy.com/v2/<KEY>
NEXT_PUBLIC_RPC_URL=

# JWT signing — generate with: openssl rand -hex 32
SESSION_SECRET=
NONCE_SECRET=

# Session TTL (seconds). Default = 7 days.
SESSION_TTL_SECONDS=604800
```

`lib/web3/env.ts` exposes:

- `readPublicEnv()` — returns `{ wcProjectId, rpcUrl }`; throws at import
  time if missing.
- `readServerEnv()` — returns `{ sessionSecret, nonceSecret, sessionTtl }`;
  throws at server-route eval time if missing.

`SESSION_SECRET` and `NONCE_SECRET` are **distinct** so a leak of one
doesn't compromise the other.

---

## 8. Testing

Vitest is already configured. Sprint 2 adds:

- `vite-tsconfig-paths` to resolve `@/*` in tests.
- `@vitejs/plugin-react` (anticipated since Sprint 0).
- `@testing-library/react` + `jsdom` environment — only for hook tests.

### 8.1 Unit tests

| File | What it covers |
|---|---|
| `lib/web3/server/session.test.ts` | round-trip sign/verify; rejects past `exp`; rejects `alg: 'none'`; rejects wrong secret; rejects tampered payload |
| `lib/web3/server/nonce.test.ts` | `issueNonce` returns 32-hex; `consumeNonce` rejects missing/expired/tampered cookie |
| `lib/web3/siwe.test.ts` | `buildSiweMessage` produces ERC-4361-compliant text; round-trips via `parseSiweMessage`; rejects non-checksummed address |
| `lib/web3/env.test.ts` | `readPublicEnv` / `readServerEnv` throw on missing/empty |

### 8.2 API route tests

| File | What it covers |
|---|---|
| `app/api/auth/nonce/route.test.ts` | happy path → 200 + cookie set; invalid address → 400 |
| `app/api/auth/verify/route.test.ts` | happy path with `privateKeyToAccount` fixture → 200 + session cookie + nonce cleared; wrong signer → 401; wrong chain → 400; expired nonce → 410; missing nonce cookie → 410 |
| `app/api/auth/me/route.test.ts` | valid JWT → 200; missing/invalid → 401 |
| `app/api/auth/logout/route.test.ts` | 204 with valid session; 204 with no session (idempotent) |

### 8.3 Note on test fixtures

The verify-route tests use `viem`'s `privateKeyToAccount(0x…)` to
generate **real** SIWE signatures from a deterministic, throwaway
private key embedded in the test file. These are cryptographic
fixtures, not mocks — the math is real; only the key is disposable.
This is the only way to test the happy path without a live wallet.
No production code path knows about these keys.

### 8.4 Out of scope for Sprint 2 tests

- `useSession`, `useSiweLogin`, `useDisconnect` hook tests — defer to
  Sprint 3 alongside balance-reading hooks, where component-test
  scaffolding is justified.
- E2E tests with real wallets — manual smoke test for Sprint 2.

---

## 9. Routing & navigation

| Route | Pre-Sprint 2 | Post-Sprint 2 |
|---|---|---|
| `/` | Public | Public, unchanged |
| `/connect` | Static modal, no real connection | Real SIWE flow; redirects to `redirectTo` on success |
| `/dashboard` | Public, mocked data | **Middleware-protected.** Without session → redirect to `/connect?redirectTo=/dashboard` |
| `/api/auth/*` | Did not exist | New |

`app/connect/page.tsx` becomes:

```tsx
export default function ConnectPage({ searchParams }: { searchParams: { redirectTo?: string } }) {
  const redirectTo = searchParams.redirectTo ?? '/dashboard'
  return (
    <main className="flex min-h-screen items-center justify-center p-gutter">
      <WalletPicker redirectTo={redirectTo} />
      <BrandingAnchor />
    </main>
  )
}
```

---

## 10. Definition of done

| Check | Pass criteria |
|---|---|
| MetaMask login | Connect → sign → land on `/dashboard` with real address rendered in Sidebar pill and DashboardHeader. |
| WalletConnect (mobile QR) | Same flow over WC. |
| Coinbase Wallet | Same flow. |
| Cancel connect | Returns to idle in `<WalletPicker>` with `user_rejected_connect` copy. |
| Cancel signature | Returns to idle with `user_rejected_signature` copy; no cookie set. |
| Wallet on chain ≠ 1 | `wrong_chain` copy; offers (via AppKit) to switch. |
| Disconnect | Sidebar button clears cookie + wagmi state; next `/dashboard` redirects. |
| Direct `/dashboard` without cookie | Redirects to `/connect?redirectTo=/dashboard`. |
| Logout idempotent | Calling `/api/auth/logout` twice returns 204 both times. |
| `npm run dev` | All routes work; no console errors in browser or terminal. |
| `npm run build` | Clean. |
| `npm run lint` / `typecheck` | Clean. No `any` without an inline reason comment. |
| `npm test` | Green, ≥ 15 tests across §8.1 and §8.2. |
| Secrets | `.env.example` committed with placeholders; `.env.local` ignored; nothing hardcoded; no secret in client bundle. |
| Hook integrity | `.claude/hooks/block-unsafe-web3.sh` unmodified; does not fire on any diff. |
| Web3 isolation | No `wagmi` / `viem` import inside `components/**`. |
| Mock isolation | Components do not import from `lib/mock/data` or `lib/mock/hooks`. |
| Wallet mock removed | `useWalletMock`, `MOCK_WALLET`, `DashboardData.wallet` no longer exist in the repo. |

---

## 11. Out of scope (explicit, must not appear)

- Real on-chain balance/limit/activity reads (Sprint 3)
- Admin panel (Sprint 4)
- KYC / Postgres / Prisma / DB sessions (Sprint 5)
- Vault contract / `deposit`/`withdraw`/`executeSwap` (Sprint 6)
- Multi-chain UX, chain switcher in nav, L2 support
- Refresh tokens, sliding sessions, rotation policies beyond TTL expiry
- Account abstraction / smart accounts / ERC-4337
- Email or SMS recovery flows
- Sign-out via a "Are you sure?" modal — Sprint 2 logout is one click
- Captcha or anti-bot on `/connect` — defer to ops
- Any approval, transaction, or signature beyond the SIWE login message
