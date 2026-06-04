# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only dashboard (email/password login) that lists every wallet that has signed in via SIWE, with its live on-chain USD value and card status, backed by a minimal Prisma/Postgres persistence layer.

**Architecture:** Stand up Prisma + Postgres. A `User` row is upserted at the end of the SIWE `verify` flow. Admins live in an `Admin` table (seeded by a script, bcrypt-hashed passwords) and authenticate with a dedicated signed-JWT cookie (`admin_session`) that mirrors the existing `lib/web3/server/session.ts` pattern. Admin pages live under `app/admin`, guarded server-side. `GET /api/admin/users` reads users from Postgres and performs read-only on-chain balance reads server-side, so wallet data never reaches the browser.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, `bcryptjs`, `jose` (JWT), viem (read-only RPC), Vitest, Tailwind.

---

## File Structure

**New files:**
- `prisma/schema.prisma` — `User`, `Admin`, `CardStatus` models
- `lib/db/prisma.ts` — `PrismaClient` singleton
- `lib/admin/server/env.ts` — admin env (`ADMIN_SESSION_SECRET`, TTL)
- `lib/admin/server/password.ts` — `hashPassword` / `verifyPassword` (bcryptjs)
- `lib/admin/server/session.ts` — `signAdminSession` / `verifyAdminSession`
- `lib/admin/server/getAdminSession.ts` — `ADMIN_SESSION_COOKIE` + `getAdminSession()`
- `lib/admin/types.ts` — `AdminUserRow`
- `lib/web3/balances/loadWalletBalance.ts` — server-safe cross-chain balance → USD
- `app/api/admin/login/route.ts`, `logout/route.ts`, `me/route.ts`, `users/route.ts`
- `app/admin/login/page.tsx`, `app/admin/page.tsx`
- `components/admin/AdminLoginForm.tsx`, `components/admin/AdminUsersTable.tsx`
- `scripts/seed-admin.ts`
- Test files alongside the modules above

**Modified files:**
- `app/api/auth/verify/route.ts` — upsert `User` after signature verification
- `app/api/auth/verify/route.test.ts` — assert the upsert
- `lib/web3/hooks/useEligibility.ts` — reuse `loadWalletBalance` (DRY)
- `package.json` — deps + `seed:admin` script
- `.env.example` — new env vars

---

## Task 1: Persistence foundation (Prisma + Postgres)

**Files:**
- Modify: `package.json`
- Create: `prisma/schema.prisma`
- Create: `lib/db/prisma.ts`
- Modify: `.env.example` (create if absent)

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install @prisma/client bcryptjs
npm install -D prisma @types/bcryptjs tsx
```
Expected: packages added to `package.json`, no errors.

- [ ] **Step 2: Add the `seed:admin` script to package.json**

In `package.json` `"scripts"`, add:
```json
    "seed:admin": "tsx scripts/seed-admin.ts"
```

- [ ] **Step 3: Create the Prisma schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum CardStatus {
  pending
  active
  suspended
}

model User {
  id            String     @id @default(cuid())
  walletAddress String     @unique // EIP-55 checksummed
  chainId       Int
  cardStatus    CardStatus @default(pending)
  firstSeenAt   DateTime   @default(now())
  lastLoginAt   DateTime   @updatedAt
}

model Admin {
  id           String   @id @default(cuid())
  email        String   @unique // stored lowercased
  passwordHash String
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 4: Create the Prisma client singleton**

Create `lib/db/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Document env vars**

Create or append to `.env.example`:
```bash
# Postgres connection string for Prisma
DATABASE_URL="postgresql://user:password@localhost:5432/auracard?schema=public"
# Admin session signing secret (>= 32 chars)
ADMIN_SESSION_SECRET="change-me-to-a-long-random-string-min-32-chars"
# Optional: admin session lifetime in seconds (default 86400 = 1 day)
ADMIN_SESSION_TTL_SECONDS="86400"
# Used only by `npm run seed:admin`
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="a-strong-password"
```

- [ ] **Step 6: Generate the Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" success message. `@prisma/client` types now resolve.

- [ ] **Step 7: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma lib/db/prisma.ts .env.example
git commit -m "feat(admin): add Prisma + Postgres persistence foundation"
```

---

## Task 2: Admin env + password hashing

**Files:**
- Create: `lib/admin/server/env.ts`
- Create: `lib/admin/server/password.ts`
- Test: `lib/admin/server/password.test.ts`

- [ ] **Step 1: Create the admin env reader**

Create `lib/admin/server/env.ts`:
```ts
import { z } from 'zod'

const AdminEnvSchema = z.object({
  adminSessionSecret: z.string().min(32, 'ADMIN_SESSION_SECRET must be at least 32 chars'),
  adminSessionTtl: z.coerce.number().int().positive().default(86400),
})

export type AdminEnv = z.infer<typeof AdminEnvSchema>

export function readAdminEnv(): AdminEnv {
  return AdminEnvSchema.parse({
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET,
    adminSessionTtl: process.env.ADMIN_SESSION_TTL_SECONDS,
  })
}
```

- [ ] **Step 2: Write the failing test for password hashing**

Create `lib/admin/server/password.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing', () => {
  it('hashes a password to a non-plaintext bcrypt string', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash).not.toBe('correct horse battery staple')
    expect(hash.startsWith('$2')).toBe(true)
  })

  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret-pass')
    expect(await verifyPassword('s3cret-pass', hash)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret-pass')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/admin/server/password.test.ts`
Expected: FAIL — cannot find module `./password`.

- [ ] **Step 4: Implement password hashing**

Create `lib/admin/server/password.ts`:
```ts
import bcrypt from 'bcryptjs'

const ROUNDS = 12

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/admin/server/password.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/admin/server/env.ts lib/admin/server/password.ts lib/admin/server/password.test.ts
git commit -m "feat(admin): admin env reader and bcrypt password helpers"
```

---

## Task 3: Admin session (sign/verify) + getAdminSession

**Files:**
- Create: `lib/admin/server/session.ts`
- Create: `lib/admin/server/getAdminSession.ts`
- Test: `lib/admin/server/session.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/admin/server/session.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { signAdminSession, verifyAdminSession } from './session'

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret-test-secret-test-secret-1234'
})

describe('admin session', () => {
  it('signs and verifies a round-trip token', async () => {
    const token = await signAdminSession({ adminId: 'abc123', email: 'admin@example.com' })
    const claims = await verifyAdminSession(token)
    expect(claims?.adminId).toBe('abc123')
    expect(claims?.email).toBe('admin@example.com')
    expect(claims?.role).toBe('admin')
  })

  it('returns null for a tampered token', async () => {
    const token = await signAdminSession({ adminId: 'abc123', email: 'admin@example.com' })
    expect(await verifyAdminSession(token + 'x')).toBeNull()
  })

  it('returns null for garbage', async () => {
    expect(await verifyAdminSession('not-a-jwt')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/admin/server/session.test.ts`
Expected: FAIL — cannot find module `./session`.

- [ ] **Step 3: Implement the admin session module**

Create `lib/admin/server/session.ts`:
```ts
import { SignJWT, jwtVerify } from 'jose'
import { readAdminEnv } from './env'

export interface AdminSessionClaims {
  adminId: string
  email: string
  role: 'admin'
  iat: number
  exp: number
}

function adminKey(): Uint8Array {
  return new TextEncoder().encode(readAdminEnv().adminSessionSecret)
}

export async function signAdminSession(input: { adminId: string; email: string }): Promise<string> {
  const { adminSessionTtl } = readAdminEnv()
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ adminId: input.adminId, email: input.email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.adminId)
    .setIssuedAt(now)
    .setExpirationTime(now + adminSessionTtl)
    .sign(adminKey())
}

export async function verifyAdminSession(token: string): Promise<AdminSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, adminKey(), { algorithms: ['HS256'] })
    const adminId = payload.adminId as string | undefined
    const email = payload.email as string | undefined
    const role = payload.role as string | undefined
    const iat = payload.iat
    const exp = payload.exp
    if (!adminId || !email || role !== 'admin' || typeof iat !== 'number' || typeof exp !== 'number') {
      return null
    }
    return { adminId, email, role: 'admin', iat, exp }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/admin/server/session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create the cookie reader**

Create `lib/admin/server/getAdminSession.ts`:
```ts
import { cookies } from 'next/headers'
import { verifyAdminSession, type AdminSessionClaims } from './session'

export const ADMIN_SESSION_COOKIE = 'admin_session'

export async function getAdminSession(): Promise<AdminSessionClaims | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyAdminSession(token)
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/admin/server/session.ts lib/admin/server/session.test.ts lib/admin/server/getAdminSession.ts
git commit -m "feat(admin): signed-JWT admin session and cookie reader"
```

---

## Task 4: Server-side wallet balance loader (+ DRY refactor)

**Files:**
- Create: `lib/web3/balances/loadWalletBalance.ts`
- Test: `lib/web3/balances/loadWalletBalance.test.ts`
- Modify: `lib/web3/hooks/useEligibility.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/web3/balances/loadWalletBalance.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseUnits } from 'viem'
import type { Address } from '@/lib/web3/types'

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return { ...actual, createPublicClient: vi.fn(() => ({})), http: vi.fn(() => ({})) }
})
vi.mock('./readBalances', () => ({ readChainBalances: vi.fn() }))
vi.mock('./prices', () => ({ readPrices: vi.fn() }))

import { readChainBalances } from './readBalances'
import { readPrices } from './prices'
import { loadWalletBalance } from './loadWalletBalance'

const ADDRESS = '0x1111111111111111111111111111111111111111' as Address

beforeEach(() => {
  vi.mocked(readPrices).mockResolvedValue({ ETH: 2000, BTC: 60000, USD: 1 })
  vi.mocked(readChainBalances).mockReset()
})

describe('loadWalletBalance', () => {
  it('aggregates balances across chains into a USD total', async () => {
    // First chain returns 1 ETH; all other chains return nothing.
    vi.mocked(readChainBalances)
      .mockResolvedValueOnce([{ canonical: 'ETH', raw: parseUnits('1', 18) }])
      .mockResolvedValue([])

    const balance = await loadWalletBalance(ADDRESS)

    expect(balance.totalUsd).toBe(2000)
    expect(balance.assets[0]).toMatchObject({ symbol: 'ETH', usdValue: 2000 })
  })

  it('degrades a failing chain to an empty contribution', async () => {
    vi.mocked(readChainBalances).mockRejectedValue(new Error('rpc down'))
    const balance = await loadWalletBalance(ADDRESS)
    expect(balance.totalUsd).toBe(0)
    expect(balance.assets).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/web3/balances/loadWalletBalance.test.ts`
Expected: FAIL — cannot find module `./loadWalletBalance`.

- [ ] **Step 3: Implement the loader**

Create `lib/web3/balances/loadWalletBalance.ts`:
```ts
import { createPublicClient, http, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
import type { Address } from '@/lib/web3/types'
import type { EligibleBalance } from '@/lib/dashboard/types'
import { getChainConfigs } from './config'
import { readChainBalances } from './readBalances'
import { readPrices } from './prices'
import { aggregateAssets, type RawAsset } from '../eligibility'

/**
 * Server-safe: read a wallet's whitelisted token balances across all configured
 * chains and value them in USD. READ-ONLY — never sends a transaction.
 */
export async function loadWalletBalance(address: Address): Promise<EligibleBalance> {
  const checksummed = getAddress(address) // validate + checksum
  const chains = getChainConfigs()
  const clients = chains.map(chain =>
    createPublicClient({ chain: chain.chain, transport: http(chain.rpcUrl) }),
  )
  const mainnetClient = clients[chains.findIndex(c => c.id === mainnet.id)] ?? clients[0]

  const pricesPromise = readPrices(mainnetClient)
  const balancesPromise = Promise.all(
    chains.map((chain, i) =>
      readChainBalances(clients[i], chain, checksummed).catch(() => [] as RawAsset[]),
    ),
  )
  const [prices, perChain] = await Promise.all([pricesPromise, balancesPromise])
  return aggregateAssets(perChain.flat(), prices)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/web3/balances/loadWalletBalance.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Refactor `useEligibility` to reuse the loader (DRY)**

In `lib/web3/hooks/useEligibility.ts`, replace the imports and `loadEligibility` body. The final file is:
```ts
'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Address } from '@/lib/web3/types'
import type { EligibleBalance, EstimatedLimit } from '@/lib/dashboard/types'
import { loadWalletBalance } from '../balances/loadWalletBalance'
import { computeEstimatedLimit } from '../eligibility'

export interface EligibilityResult {
  balance: EligibleBalance
  limit: EstimatedLimit
}

async function loadEligibility(address: Address): Promise<EligibilityResult> {
  const balance = await loadWalletBalance(address)
  return { balance, limit: computeEstimatedLimit(balance.totalUsd) }
}

export function useEligibility(address: Address | undefined): UseQueryResult<EligibilityResult> {
  return useQuery({
    queryKey: ['eligibility', address],
    queryFn: () => loadEligibility(address as Address),
    enabled: Boolean(address),
    staleTime: 60_000,
    retry: 1,
  })
}
```

- [ ] **Step 6: Run the full test suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS — existing eligibility/balance behavior unchanged, no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/web3/balances/loadWalletBalance.ts lib/web3/balances/loadWalletBalance.test.ts lib/web3/hooks/useEligibility.ts
git commit -m "feat(web3): server-safe loadWalletBalance and reuse it in useEligibility"
```

---

## Task 5: Admin login route

**Files:**
- Create: `app/api/admin/login/route.ts`
- Test: `app/api/admin/login/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/admin/login/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/prisma', () => ({ prisma: { admin: { findUnique: vi.fn() } } }))

import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/admin/server/password'
import { POST } from './route'

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret-test-secret-test-secret-1234'
})
beforeEach(() => {
  vi.mocked(prisma.admin.findUnique).mockReset()
})

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/login', () => {
  it('sets an admin_session cookie on correct credentials', async () => {
    const passwordHash = await hashPassword('right-pass')
    vi.mocked(prisma.admin.findUnique).mockResolvedValue({
      id: 'a1', email: 'admin@example.com', passwordHash, createdAt: new Date(),
    } as never)

    const res = await POST(req({ email: 'admin@example.com', password: 'right-pass' }))
    expect(res.status).toBe(200)
    expect(res.cookies.get('admin_session')?.value).toBeTruthy()
  })

  it('returns 401 on wrong password', async () => {
    const passwordHash = await hashPassword('right-pass')
    vi.mocked(prisma.admin.findUnique).mockResolvedValue({
      id: 'a1', email: 'admin@example.com', passwordHash, createdAt: new Date(),
    } as never)

    const res = await POST(req({ email: 'admin@example.com', password: 'wrong' }))
    expect(res.status).toBe(401)
    expect(res.cookies.get('admin_session')?.value).toBeFalsy()
  })

  it('returns 401 (generic) for an unknown email', async () => {
    vi.mocked(prisma.admin.findUnique).mockResolvedValue(null as never)
    const res = await POST(req({ email: 'nope@example.com', password: 'whatever' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'invalid_credentials' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/admin/login/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Implement the login route**

Create `app/api/admin/login/route.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/admin/server/password'
import { signAdminSession } from '@/lib/admin/server/session'
import { ADMIN_SESSION_COOKIE } from '@/lib/admin/server/getAdminSession'
import { readAdminEnv } from '@/lib/admin/server/env'

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }
  const email = parsed.data.email.toLowerCase()
  const { password } = parsed.data

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    // Generic error: never reveal whether the email exists.
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const jwt = await signAdminSession({ adminId: admin.id, email: admin.email })
  const { adminSessionTtl } = readAdminEnv()
  const res = NextResponse.json({ email: admin.email })
  res.cookies.set(ADMIN_SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: adminSessionTtl,
  })
  return res
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/admin/login/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/login/route.ts app/api/admin/login/route.test.ts
git commit -m "feat(admin): email/password login route with admin session cookie"
```

---

## Task 6: Admin logout + me routes

**Files:**
- Create: `app/api/admin/logout/route.ts`
- Create: `app/api/admin/me/route.ts`

- [ ] **Step 1: Implement logout route**

Create `app/api/admin/logout/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/admin/server/getAdminSession'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
```

- [ ] **Step 2: Implement me route**

Create `app/api/admin/me/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  return NextResponse.json({ email: session.email })
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/logout/route.ts app/api/admin/me/route.ts
git commit -m "feat(admin): logout and session-check routes"
```

---

## Task 7: Admin users route (DB + live balances)

**Files:**
- Create: `lib/admin/types.ts`
- Create: `app/api/admin/users/route.ts`
- Test: `app/api/admin/users/route.test.ts`

- [ ] **Step 1: Create the shared row type**

Create `lib/admin/types.ts`:
```ts
import type { CardStatus } from '@prisma/client'

export interface AdminUserRow {
  walletAddress: string
  chainId: number
  cardStatus: CardStatus
  firstSeenAt: string // ISO
  lastLoginAt: string // ISO
  totalUsd: number | null // null when the on-chain read failed
}
```

- [ ] **Step 2: Write the failing test**

Create `app/api/admin/users/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/server/getAdminSession', () => ({
  getAdminSession: vi.fn(),
  ADMIN_SESSION_COOKIE: 'admin_session',
}))
vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { findMany: vi.fn() } } }))
vi.mock('@/lib/web3/balances/loadWalletBalance', () => ({ loadWalletBalance: vi.fn() }))

import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { prisma } from '@/lib/db/prisma'
import { loadWalletBalance } from '@/lib/web3/balances/loadWalletBalance'
import { GET } from './route'

beforeEach(() => {
  vi.mocked(getAdminSession).mockReset()
  vi.mocked(prisma.user.findMany).mockReset()
  vi.mocked(loadWalletBalance).mockReset()
})

describe('GET /api/admin/users', () => {
  it('returns 401 without an admin session', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns rows with live USD totals for an authenticated admin', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      adminId: 'a1', email: 'admin@example.com', role: 'admin', iat: 1, exp: 2,
    })
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'u1',
        walletAddress: '0x1111111111111111111111111111111111111111',
        chainId: 1,
        cardStatus: 'pending',
        firstSeenAt: new Date('2026-06-01T00:00:00Z'),
        lastLoginAt: new Date('2026-06-02T00:00:00Z'),
      },
    ] as never)
    vi.mocked(loadWalletBalance).mockResolvedValue({ totalUsd: 1234.5, assets: [] })

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.users).toHaveLength(1)
    expect(json.users[0]).toMatchObject({
      walletAddress: '0x1111111111111111111111111111111111111111',
      chainId: 1,
      cardStatus: 'pending',
      totalUsd: 1234.5,
    })
  })

  it('reports totalUsd: null when the on-chain read fails', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      adminId: 'a1', email: 'admin@example.com', role: 'admin', iat: 1, exp: 2,
    })
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'u1',
        walletAddress: '0x1111111111111111111111111111111111111111',
        chainId: 1,
        cardStatus: 'pending',
        firstSeenAt: new Date('2026-06-01T00:00:00Z'),
        lastLoginAt: new Date('2026-06-02T00:00:00Z'),
      },
    ] as never)
    vi.mocked(loadWalletBalance).mockRejectedValue(new Error('rpc down'))

    const res = await GET()
    const json = await res.json()
    expect(json.users[0].totalUsd).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run app/api/admin/users/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 4: Implement the users route**

Create `app/api/admin/users/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getAddress } from 'viem'
import { prisma } from '@/lib/db/prisma'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { loadWalletBalance } from '@/lib/web3/balances/loadWalletBalance'
import type { Address } from '@/lib/web3/types'
import type { AdminUserRow } from '@/lib/admin/types'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const users = await prisma.user.findMany({ orderBy: { firstSeenAt: 'desc' } })
  const rows: AdminUserRow[] = await Promise.all(
    users.map(async user => {
      let totalUsd: number | null = null
      try {
        const balance = await loadWalletBalance(getAddress(user.walletAddress) as Address)
        totalUsd = balance.totalUsd
      } catch {
        totalUsd = null // RPC failure surfaces as "unavailable", never a 500
      }
      return {
        walletAddress: user.walletAddress,
        chainId: user.chainId,
        cardStatus: user.cardStatus,
        firstSeenAt: user.firstSeenAt.toISOString(),
        lastLoginAt: user.lastLoginAt.toISOString(),
        totalUsd,
      }
    }),
  )
  return NextResponse.json({ users: rows })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/api/admin/users/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/admin/types.ts app/api/admin/users/route.ts app/api/admin/users/route.test.ts
git commit -m "feat(admin): users route reading DB + live on-chain USD totals"
```

---

## Task 8: Persist users on SIWE login

**Files:**
- Modify: `app/api/auth/verify/route.ts`
- Modify: `app/api/auth/verify/route.test.ts`

- [ ] **Step 1: Add a failing test asserting the upsert**

In `app/api/auth/verify/route.test.ts`, add this mock at the top (after the existing imports, before `describe`):
```ts
import { vi } from 'vitest'
vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { upsert: vi.fn().mockResolvedValue({}) } } }))
import { prisma } from '@/lib/db/prisma'
```
Then add this test inside the existing `describe('POST /api/auth/verify', ...)` block:
```ts
  it('upserts a User row on a valid signature', async () => {
    const { message, signature, cookieValue } = await setupSignedSession()
    await POST(buildReq({ message, signature }, cookieValue))
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { walletAddress: ADDR } }),
    )
  })
```
Note: `vi` is already imported by the new line above; if the file already imports from `'vitest'`, merge `vi` into that import instead of duplicating.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/auth/verify/route.test.ts`
Expected: FAIL — `prisma.user.upsert` not called (route doesn't persist yet).

- [ ] **Step 3: Add the upsert to the verify route**

In `app/api/auth/verify/route.ts`, add the import near the other imports:
```ts
import { prisma } from '@/lib/db/prisma'
```
Then, immediately after the signature is confirmed valid (after the `isValid` check that returns 401, before `const jwt = await signSession(...)`), add:
```ts
  // Persist the connected wallet for the admin dashboard. Best-effort: a DB
  // hiccup must not block a user from logging in.
  try {
    await prisma.user.upsert({
      where: { walletAddress: nonceData.address },
      create: { walletAddress: nonceData.address, chainId: parsedMessage.chainId },
      update: { chainId: parsedMessage.chainId },
    })
  } catch {
    // swallow — login proceeds; the row will be created on a later login
  }
```
(`nonceData.address` is already EIP-55 checksummed via `getAddress`. `lastLoginAt` updates automatically via `@updatedAt`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/auth/verify/route.test.ts`
Expected: PASS — all existing tests plus the new upsert test.

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/verify/route.ts app/api/auth/verify/route.test.ts
git commit -m "feat(auth): persist connected wallet as User on SIWE verify"
```

---

## Task 9: Admin seed script

**Files:**
- Create: `scripts/seed-admin.ts`

- [ ] **Step 1: Implement the seed script**

Create `scripts/seed-admin.ts` (relative imports — this runs outside Next's `@/` alias):
```ts
import { prisma } from '../lib/db/prisma'
import { hashPassword } from '../lib/admin/server/password'

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars to seed an admin.')
  }
  const passwordHash = await hashPassword(password)
  const lower = email.toLowerCase()
  const admin = await prisma.admin.upsert({
    where: { email: lower },
    create: { email: lower, passwordHash },
    update: { passwordHash },
  })
  console.log(`Seeded admin: ${admin.email}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
```

- [ ] **Step 2: Verify it runs (requires DATABASE_URL + a migrated DB)**

Run (only if a Postgres DB is configured and migrated):
```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=devpassword npm run seed:admin
```
Expected: `Seeded admin: admin@example.com`. If no DB is available, skip this step — the script is exercised manually during setup; CI/tests do not require it.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-admin.ts
git commit -m "feat(admin): seed-admin script (npm run seed:admin)"
```

---

## Task 10: Admin login UI

**Files:**
- Create: `components/admin/AdminLoginForm.tsx`
- Create: `app/admin/login/page.tsx`

- [ ] **Step 1: Implement the login form (client component)**

Create `components/admin/AdminLoginForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        setError('Invalid email or password.')
        return
      }
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <h1 className="mb-6 text-xl font-semibold text-white">Admin sign in</h1>

      <label htmlFor="email" className="mb-1 block text-sm text-white/70">Email</label>
      <input
        id="email" type="email" autoComplete="username" required
        value={email} onChange={e => setEmail(e.target.value)}
        className="mb-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
      />

      <label htmlFor="password" className="mb-1 block text-sm text-white/70">Password</label>
      <input
        id="password" type="password" autoComplete="current-password" required
        value={password} onChange={e => setPassword(e.target.value)}
        className="mb-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
      />

      {error && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit" disabled={submitting}
        className="w-full rounded-lg bg-gradient-to-r from-[#7C5CFF] via-[#4F8CFF] to-[#2DD4BF] px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Implement the login page (redirect if already signed in)**

Create `app/admin/login/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export default async function AdminLoginPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0F] px-4">
      <AdminLoginForm />
    </main>
  )
}
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminLoginForm.tsx app/admin/login/page.tsx
git commit -m "feat(admin): admin login screen"
```

---

## Task 11: Admin dashboard (users table + guard)

**Files:**
- Create: `components/admin/AdminUsersTable.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Implement the users table (client component)**

Create `components/admin/AdminUsersTable.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUserRow } from '@/lib/admin/types'

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatUsd(value: number | null): string {
  if (value === null) return 'Unavailable'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function AdminUsersTable({ adminEmail }: { adminEmail: string }) {
  const router = useRouter()
  const [rows, setRows] = useState<AdminUserRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/users')
      .then(async res => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then(json => { if (active) setRows(json.users as AdminUserRow[]) })
      .catch(() => { if (active) setError('Could not load users.') })
    return () => { active = false }
  }, [])

  async function onLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="text-sm text-white/50">Signed in as {adminEmail}</p>
        </div>
        <button onClick={onLogout} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
          Sign out
        </button>
      </header>

      {error && <p role="alert" className="text-red-400">{error}</p>}
      {!error && !rows && <p className="text-white/50">Loading users…</p>}

      {rows && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Wallet</th>
                <th className="px-4 py-3 font-medium">Chain</th>
                <th className="px-4 py-3 font-medium">Value (USD)</th>
                <th className="px-4 py-3 font-medium">Card status</th>
                <th className="px-4 py-3 font-medium">First seen</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="text-white/90">
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-white/50">No users yet.</td></tr>
              )}
              {rows.map(row => (
                <tr key={row.walletAddress} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono" title={row.walletAddress}>{shortAddress(row.walletAddress)}</td>
                  <td className="px-4 py-3">{row.chainId}</td>
                  <td className="px-4 py-3">{formatUsd(row.totalUsd)}</td>
                  <td className="px-4 py-3 capitalize">{row.cardStatus}</td>
                  <td className="px-4 py-3 text-white/60">{new Date(row.firstSeenAt).toLocaleDateString('en-US')}</td>
                  <td className="px-4 py-3 text-white/60">{new Date(row.lastLoginAt).toLocaleDateString('en-US')}</td>
                  <td className="px-4 py-3">
                    {/* Mock-only: performs no on-chain action and changes no state. */}
                    <button
                      type="button"
                      onClick={() => alert('Claim is a mock — no action performed.')}
                      className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
                    >
                      Claim
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Implement the guarded admin page**

Create `app/admin/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'

export default async function AdminPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return (
    <main className="min-h-screen bg-[#0A0A0F]">
      <AdminUsersTable adminEmail={session.email} />
    </main>
  )
}
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminUsersTable.tsx app/admin/page.tsx
git commit -m "feat(admin): users dashboard with live USD values and mock Claim button"
```

---

## Task 12: Full verification

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: PASS — all tests including the new admin/session/password/balance/route tests.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (no errors).

- [ ] **Step 4: Manual smoke test (requires a running Postgres + migrated schema)**

```bash
# one-time DB setup
npx prisma migrate dev --name init
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=devpassword npm run seed:admin
npm run dev
```
Then:
1. Visit `/admin` → redirected to `/admin/login`.
2. Sign in with the seeded credentials → lands on `/admin`.
3. Sign in to the main app with a wallet (SIWE) in another session → a row appears in the admin table with a live USD value.
4. The "Claim" button shows the mock alert and performs no action.
5. "Sign out" clears the session and returns to `/admin/login`.

- [ ] **Step 5: Final commit (if any uncommitted changes remain)**

```bash
git add -A
git commit -m "chore(admin): admin dashboard end-to-end verification"
```

---

## Self-Review Notes

- **Spec coverage:** Data model (Task 1), admin auth + bcrypt + separate cookie (Tasks 2–3, 5–6), seed script (Task 9), live on-chain reads server-side (Tasks 4, 7), screens (Tasks 10–11), `User` upsert on SIWE verify (Task 8), tests (Tasks 2–5, 7–8), security (generic login error, read-only reads, env-only secrets, mock-only Claim) — all covered.
- **Out of scope (per spec):** user detail page, search/filter/sort, pagination, card-status mutation, multiple wallets per user, real Claim behavior. A `log`/notice for very large user counts is deferred with pagination.
- **Type consistency:** `AdminSessionClaims`, `AdminUserRow`, `loadWalletBalance(): EligibleBalance`, `CardStatus` (from `@prisma/client`), and cookie name `admin_session` (`ADMIN_SESSION_COOKIE`) are used consistently across tasks.
