# Sprint 2 — Wallet Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/connect` screen perform a real Sign-In with Ethereum flow (Reown AppKit + wagmi + viem), persist the session as an HttpOnly JWT cookie, gate `/dashboard` behind the session, and remove every wallet-related mock from the codebase.

**Architecture:** Three layers with sharp boundaries. **Client** layer wires wagmi + Reown AppKit and exposes hooks (`useSession`, `useSiweLogin`, `useDisconnect`). **Server** layer (`lib/web3/server/`) owns JWT signing and nonce issuance; API routes under `app/api/auth/` orchestrate the SIWE handshake. **Edge** middleware verifies the session JWT on `/dashboard/:path*` and redirects unauthenticated requests to `/connect?redirectTo=…`.

**Tech Stack:**
- Reown AppKit (`@reown/appkit` + `@reown/appkit-adapter-wagmi`) — connector UI
- wagmi v2 + viem v2 — wallet hooks and SIWE signature verification
- `jose` — Edge-compatible HS256 JWT for session + nonce cookies
- `siwe` — ERC-4361 canonical message builder/parser
- `zod` — request-body and env validation
- `@tanstack/react-query` — required by wagmi; also caches `useSession`
- `vitest` (already configured) — unit + API route tests
- `@vitejs/plugin-react`, `vite-tsconfig-paths`, `@testing-library/react`, `jsdom` — test infra (testing-library + jsdom installed but not exercised in Sprint 2; Sprint 3 will use them)

**Reference spec:** [docs/superpowers/specs/2026-06-02-sprint-2-wallet-login-design.md](../specs/2026-06-02-sprint-2-wallet-login-design.md)

**Working directory:** `d:\projetos\cripto card\` (Windows path with space — quote in shells).

**Conventions for every task:**
- Conventional commits (`feat:`, `feat(<area>):`, `chore:`, `test:`, `fix:`).
- After each task: `npm run typecheck` and `npm run lint` — both must pass before commit.
- For tasks with tests: `npm test` must be green for the affected file before commit.
- Never modify `.claude/hooks/block-unsafe-web3.sh` or bypass the hook.
- No `any` without an inline `// reason: …` comment.

---

## Phase 0 — Setup

### Task 0.1: Install Sprint 2 dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install wagmi@^2.14.0 viem@^2.21.0 @reown/appkit@^1.6.0 @reown/appkit-adapter-wagmi@^1.6.0 @tanstack/react-query@^5.60.0 jose@^5.9.0 zod@^3.23.0 siwe@^2.3.0
```

Expected: dependencies added to `package.json`, no peer-dep errors blocking install (warnings about React peer ranges are acceptable).

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D @vitejs/plugin-react@^4.3.0 vite-tsconfig-paths@^5.1.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.6.0 jsdom@^25.0.0
```

- [ ] **Step 3: Verify install**

```bash
npm run typecheck
npm run lint
```

Both must pass (no existing source uses these yet, so nothing should break).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add wagmi, viem, reown appkit, siwe, jose, zod for sprint 2"
```

---

### Task 0.2: Update vitest config and add testing setup file

**Files:**
- Modify: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Update `vitest.config.ts`**

Replace the existing file entirely with:

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
  },
})
```

- [ ] **Step 2: Create `vitest.setup.ts`**

```ts
// Test env vars for routes/server modules that read process.env.
// Real values live in .env.local (gitignored).
process.env.SESSION_SECRET ||= '0'.repeat(64)
process.env.NONCE_SECRET ||= '1'.repeat(64)
process.env.SESSION_TTL_SECONDS ||= '604800'
process.env.NEXT_PUBLIC_WC_PROJECT_ID ||= 'test_project_id'
process.env.NEXT_PUBLIC_RPC_URL ||= 'https://eth-mainnet.test/v2/test'
```

- [ ] **Step 3: Verify**

```bash
npm test
```

Expected: `0 tests passed` (no test files exist yet, `passWithNoTests: true` makes this an exit-0 success).

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts vitest.setup.ts
git commit -m "chore: wire vitest plugins and shared env setup"
```

---

### Task 0.3: `.env.example` and runtime env validation

**Files:**
- Create: `.env.example`
- Create: `lib/web3/env.ts`
- Create: `lib/web3/env.test.ts`

- [ ] **Step 1: Create `.env.example`**

```
# Reown Cloud project ID — get one at https://cloud.reown.com
NEXT_PUBLIC_WC_PROJECT_ID=

# Ethereum mainnet RPC — Alchemy app URL
# https://eth-mainnet.g.alchemy.com/v2/<KEY>
NEXT_PUBLIC_RPC_URL=

# Session JWT signing — generate with: openssl rand -hex 32
SESSION_SECRET=

# Nonce cookie signing — generate with: openssl rand -hex 32 (DIFFERENT from SESSION_SECRET)
NONCE_SECRET=

# Session TTL (seconds). Default = 7 days.
SESSION_TTL_SECONDS=604800
```

- [ ] **Step 2: Write the failing test file `lib/web3/env.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readPublicEnv, readServerEnv } from './env'

describe('readPublicEnv', () => {
  let snapshot: NodeJS.ProcessEnv

  beforeEach(() => { snapshot = { ...process.env } })
  afterEach(() => { process.env = snapshot })

  it('returns wcProjectId and rpcUrl when set', () => {
    process.env.NEXT_PUBLIC_WC_PROJECT_ID = 'pid'
    process.env.NEXT_PUBLIC_RPC_URL = 'https://eth.example/v2/abc'
    expect(readPublicEnv()).toEqual({ wcProjectId: 'pid', rpcUrl: 'https://eth.example/v2/abc' })
  })

  it('throws when wcProjectId missing', () => {
    delete process.env.NEXT_PUBLIC_WC_PROJECT_ID
    process.env.NEXT_PUBLIC_RPC_URL = 'https://eth.example/v2/abc'
    expect(() => readPublicEnv()).toThrow()
  })

  it('throws when rpcUrl is not a URL', () => {
    process.env.NEXT_PUBLIC_WC_PROJECT_ID = 'pid'
    process.env.NEXT_PUBLIC_RPC_URL = 'not-a-url'
    expect(() => readPublicEnv()).toThrow()
  })
})

describe('readServerEnv', () => {
  let snapshot: NodeJS.ProcessEnv

  beforeEach(() => { snapshot = { ...process.env } })
  afterEach(() => { process.env = snapshot })

  it('parses all server values with defaults', () => {
    process.env.SESSION_SECRET = '0'.repeat(64)
    process.env.NONCE_SECRET = '1'.repeat(64)
    delete process.env.SESSION_TTL_SECONDS
    const env = readServerEnv()
    expect(env.sessionSecret).toBe('0'.repeat(64))
    expect(env.nonceSecret).toBe('1'.repeat(64))
    expect(env.sessionTtl).toBe(604800)
  })

  it('throws when sessionSecret is too short', () => {
    process.env.SESSION_SECRET = 'short'
    process.env.NONCE_SECRET = '1'.repeat(64)
    expect(() => readServerEnv()).toThrow()
  })

  it('throws when nonceSecret missing', () => {
    process.env.SESSION_SECRET = '0'.repeat(64)
    delete process.env.NONCE_SECRET
    expect(() => readServerEnv()).toThrow()
  })

  it('coerces SESSION_TTL_SECONDS string to number', () => {
    process.env.SESSION_SECRET = '0'.repeat(64)
    process.env.NONCE_SECRET = '1'.repeat(64)
    process.env.SESSION_TTL_SECONDS = '3600'
    expect(readServerEnv().sessionTtl).toBe(3600)
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -- lib/web3/env.test.ts
```

Expected: import error (`env.ts` does not exist).

- [ ] **Step 4: Create `lib/web3/env.ts`**

```ts
import { z } from 'zod'

const PublicEnvSchema = z.object({
  wcProjectId: z.string().min(1, 'NEXT_PUBLIC_WC_PROJECT_ID is required'),
  rpcUrl: z.string().url('NEXT_PUBLIC_RPC_URL must be a URL'),
})

const ServerEnvSchema = z.object({
  sessionSecret: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  nonceSecret: z.string().min(32, 'NONCE_SECRET must be at least 32 chars'),
  sessionTtl: z.coerce.number().int().positive().default(604800),
})

export type PublicEnv = z.infer<typeof PublicEnvSchema>
export type ServerEnv = z.infer<typeof ServerEnvSchema>

export function readPublicEnv(): PublicEnv {
  return PublicEnvSchema.parse({
    wcProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  })
}

export function readServerEnv(): ServerEnv {
  return ServerEnvSchema.parse({
    sessionSecret: process.env.SESSION_SECRET,
    nonceSecret: process.env.NONCE_SECRET,
    sessionTtl: process.env.SESSION_TTL_SECONDS,
  })
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- lib/web3/env.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 6: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add .env.example lib/web3/env.ts lib/web3/env.test.ts
git commit -m "feat(web3): add env validation and .env.example"
```

---

## Phase 1 — Core types, chain config, SIWE message

### Task 1.1: Types and chain helpers

**Files:**
- Create: `lib/web3/types.ts`
- Create: `lib/web3/chains.ts`

- [ ] **Step 1: Create `lib/web3/types.ts`**

```ts
import type { Address } from '@/lib/mock/types'

export type { Address }

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
  issuedAt: string
  statement?: string
}

export type SiweLoginError =
  | 'user_rejected_connect'
  | 'user_rejected_signature'
  | 'wrong_chain'
  | 'nonce_failed'
  | 'verify_failed'
  | 'network_error'

export type SiweLoginState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'requesting_nonce' }
  | { status: 'awaiting_signature' }
  | { status: 'verifying' }
  | { status: 'success'; address: Address }
  | { status: 'error'; error: SiweLoginError }

export type SessionState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; address: Address; chainId: number }

export interface WalletSession {
  address: Address
  addressShort: string
  chainId: number
  chainName: string
}
```

(Phase 8 will move `Address` to live here primarily; for now we re-export from the mock module to avoid breaking Sprint 1 imports.)

- [ ] **Step 2: Create `lib/web3/chains.ts`**

```ts
import { mainnet } from 'wagmi/chains'

export const SUPPORTED_CHAINS = [mainnet] as const
export const DEFAULT_CHAIN_ID: number = mainnet.id  // 1

export function getChainName(chainId: number): string {
  if (chainId === 1) return 'Ethereum'
  return 'Unknown'
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add lib/web3/types.ts lib/web3/chains.ts
git commit -m "feat(web3): add session/SIWE types and chain helpers"
```

---

### Task 1.2: SIWE message builder/parser

**Files:**
- Create: `lib/web3/siwe.ts`
- Create: `lib/web3/siwe.test.ts`

- [ ] **Step 1: Write the failing tests `lib/web3/siwe.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { buildSiweMessage, parseSiweMessage } from './siwe'

const baseArgs = {
  domain: 'aura.local',
  address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' as const,
  uri: 'https://aura.local',
  chainId: 1,
  nonce: 'a'.repeat(32),
  issuedAt: '2026-06-02T12:00:00.000Z',
  statement: 'Sign in to Aura.',
}

describe('buildSiweMessage', () => {
  it('produces ERC-4361 canonical text', () => {
    const msg = buildSiweMessage(baseArgs)
    expect(msg).toContain('aura.local wants you to sign in with your Ethereum account:')
    expect(msg).toContain('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
    expect(msg).toContain('Sign in to Aura.')
    expect(msg).toContain('URI: https://aura.local')
    expect(msg).toContain('Version: 1')
    expect(msg).toContain('Chain ID: 1')
    expect(msg).toContain(`Nonce: ${'a'.repeat(32)}`)
    expect(msg).toContain('Issued At: 2026-06-02T12:00:00.000Z')
  })

  it('checksums the address', () => {
    const lowercased = '0x71c7656ec7ab88b098defb751b7401b5f6d8976f' as const
    const msg = buildSiweMessage({ ...baseArgs, address: lowercased })
    expect(msg).toContain('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
  })

  it('defaults statement when not provided', () => {
    const { statement: _omit, ...rest } = baseArgs
    const msg = buildSiweMessage(rest)
    expect(msg).toContain('Sign in to Aura.')
  })
})

describe('parseSiweMessage', () => {
  it('round-trips with buildSiweMessage', () => {
    const text = buildSiweMessage(baseArgs)
    const parsed = parseSiweMessage(text)
    expect(parsed.domain).toBe('aura.local')
    expect(parsed.address).toBe('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
    expect(parsed.uri).toBe('https://aura.local')
    expect(parsed.chainId).toBe(1)
    expect(parsed.nonce).toBe('a'.repeat(32))
    expect(parsed.issuedAt).toBe('2026-06-02T12:00:00.000Z')
    expect(parsed.statement).toBe('Sign in to Aura.')
  })

  it('throws on malformed input', () => {
    expect(() => parseSiweMessage('not a siwe message at all')).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/web3/siwe.test.ts
```

Expected: import error (`siwe.ts` not found).

- [ ] **Step 3: Create `lib/web3/siwe.ts`**

```ts
import { SiweMessage } from 'siwe'
import { getAddress } from 'viem'
import type { Address, SiweMessageArgs } from './types'

export function buildSiweMessage(args: SiweMessageArgs): string {
  const message = new SiweMessage({
    domain: args.domain,
    address: getAddress(args.address),
    uri: args.uri,
    version: '1',
    chainId: args.chainId,
    nonce: args.nonce,
    issuedAt: args.issuedAt,
    statement: args.statement ?? 'Sign in to Aura.',
  })
  return message.prepareMessage()
}

export interface ParsedSiweMessage {
  domain: string
  address: Address
  uri: string
  chainId: number
  nonce: string
  issuedAt: string
  statement?: string
}

export function parseSiweMessage(message: string): ParsedSiweMessage {
  const m = new SiweMessage(message)
  return {
    domain: m.domain,
    address: getAddress(m.address as Address),
    uri: m.uri,
    chainId: m.chainId,
    nonce: m.nonce,
    issuedAt: m.issuedAt ?? '',
    statement: m.statement,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/web3/siwe.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add lib/web3/siwe.ts lib/web3/siwe.test.ts
git commit -m "feat(web3): add SIWE message build/parse wrapper"
```

---

## Phase 2 — Server primitives

### Task 2.1: Session JWT sign/verify

**Files:**
- Create: `lib/web3/server/session.ts`
- Create: `lib/web3/server/session.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/web3/server/session.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SignJWT } from 'jose'
import { signSession, verifySession } from './session'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' as const

describe('session', () => {
  let snapshot: NodeJS.ProcessEnv

  beforeEach(() => { snapshot = { ...process.env } })
  afterEach(() => { process.env = snapshot })

  it('round-trips sign and verify', async () => {
    const token = await signSession({ address: ADDR, chainId: 1 })
    const claims = await verifySession(token)
    expect(claims).not.toBeNull()
    expect(claims!.address).toBe(ADDR)
    expect(claims!.chainId).toBe(1)
    expect(claims!.iat).toBeTypeOf('number')
    expect(claims!.exp).toBeGreaterThan(claims!.iat)
  })

  it('returns null on wrong secret', async () => {
    const token = await signSession({ address: ADDR, chainId: 1 })
    process.env.SESSION_SECRET = '9'.repeat(64)
    const claims = await verifySession(token)
    expect(claims).toBeNull()
  })

  it('returns null on tampered token', async () => {
    const token = await signSession({ address: ADDR, chainId: 1 })
    const tampered = token.slice(0, -2) + 'aa'
    const claims = await verifySession(tampered)
    expect(claims).toBeNull()
  })

  it('returns null on expired token', async () => {
    process.env.SESSION_TTL_SECONDS = '1'
    const token = await signSession({ address: ADDR, chainId: 1 })
    await new Promise(r => setTimeout(r, 1100))
    const claims = await verifySession(token)
    expect(claims).toBeNull()
  })

  it('returns null on alg: "none" attempt', async () => {
    const forged = await new SignJWT({ address: ADDR, chainId: 1 })
      .setProtectedHeader({ alg: 'none' as 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new Uint8Array(0))
      .catch(() => null)
    expect(forged === null || (await verifySession(forged ?? '')) === null).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/web3/server/session.test.ts
```

Expected: import error.

- [ ] **Step 3: Create `lib/web3/server/session.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose'
import { getAddress } from 'viem'
import type { Address, SessionClaims } from '@/lib/web3/types'
import { readServerEnv } from '@/lib/web3/env'

function sessionKey(): Uint8Array {
  return new TextEncoder().encode(readServerEnv().sessionSecret)
}

export async function signSession(input: { address: Address; chainId: number }): Promise<string> {
  const { sessionTtl } = readServerEnv()
  const now = Math.floor(Date.now() / 1000)
  const address = getAddress(input.address)
  return new SignJWT({ address, chainId: input.chainId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(address)
    .setIssuedAt(now)
    .setExpirationTime(now + sessionTtl)
    .sign(sessionKey())
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ['HS256'] })
    const address = payload.address as string | undefined
    const chainId = payload.chainId as number | undefined
    const iat = payload.iat
    const exp = payload.exp
    if (!address || typeof chainId !== 'number' || typeof iat !== 'number' || typeof exp !== 'number') {
      return null
    }
    return { address: getAddress(address as Address), chainId, iat, exp }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/web3/server/session.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add lib/web3/server/session.ts lib/web3/server/session.test.ts
git commit -m "feat(web3/server): add JWT session sign/verify"
```

---

### Task 2.2: Nonce issuance and consumption

**Files:**
- Create: `lib/web3/server/nonce.ts`
- Create: `lib/web3/server/nonce.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/web3/server/nonce.test.ts
import { describe, expect, it } from 'vitest'
import { issueNonce, consumeNonceCookie } from './nonce'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' as const

describe('nonce', () => {
  it('issues a 32-hex-char nonce', async () => {
    const { nonce } = await issueNonce(ADDR)
    expect(nonce).toMatch(/^[0-9a-f]{32}$/)
  })

  it('successive nonces are unique', async () => {
    const a = await issueNonce(ADDR)
    const b = await issueNonce(ADDR)
    expect(a.nonce).not.toBe(b.nonce)
  })

  it('round-trips the cookie value', async () => {
    const { nonce, cookieValue } = await issueNonce(ADDR)
    const consumed = await consumeNonceCookie(cookieValue)
    expect(consumed).not.toBeNull()
    expect(consumed!.nonce).toBe(nonce)
    expect(consumed!.address).toBe(ADDR)
  })

  it('returns null on tampered cookie', async () => {
    const { cookieValue } = await issueNonce(ADDR)
    const tampered = cookieValue.slice(0, -2) + 'aa'
    const consumed = await consumeNonceCookie(tampered)
    expect(consumed).toBeNull()
  })

  it('returns null on completely invalid cookie', async () => {
    const consumed = await consumeNonceCookie('not.a.jwt')
    expect(consumed).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/web3/server/nonce.test.ts
```

Expected: import error.

- [ ] **Step 3: Create `lib/web3/server/nonce.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose'
import { getAddress } from 'viem'
import { randomBytes } from 'node:crypto'
import type { Address } from '@/lib/web3/types'
import { readServerEnv } from '@/lib/web3/env'

export const NONCE_COOKIE = 'siwe_nonce'
export const NONCE_TTL_SECONDS = 300

function nonceKey(): Uint8Array {
  return new TextEncoder().encode(readServerEnv().nonceSecret)
}

export interface IssuedNonce {
  nonce: string
  cookieValue: string
}

export async function issueNonce(address: Address): Promise<IssuedNonce> {
  const nonce = randomBytes(16).toString('hex')
  const checksummed = getAddress(address)
  const now = Math.floor(Date.now() / 1000)
  const cookieValue = await new SignJWT({ nonce, address: checksummed })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + NONCE_TTL_SECONDS)
    .sign(nonceKey())
  return { nonce, cookieValue }
}

export interface ConsumedNonce {
  nonce: string
  address: Address
}

export async function consumeNonceCookie(token: string): Promise<ConsumedNonce | null> {
  try {
    const { payload } = await jwtVerify(token, nonceKey(), { algorithms: ['HS256'] })
    const nonce = payload.nonce as string | undefined
    const address = payload.address as string | undefined
    if (!nonce || !address) return null
    return { nonce, address: getAddress(address as Address) }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/web3/server/nonce.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add lib/web3/server/nonce.ts lib/web3/server/nonce.test.ts
git commit -m "feat(web3/server): add SIWE nonce issue/consume"
```

---

### Task 2.3: RSC session helper

**Files:**
- Create: `lib/web3/server/getSession.ts`

- [ ] **Step 1: Create `lib/web3/server/getSession.ts`**

```ts
import { cookies } from 'next/headers'
import { verifySession } from './session'
import type { SessionClaims } from '@/lib/web3/types'

export const SESSION_COOKIE = 'session'

export async function getSession(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add lib/web3/server/getSession.ts
git commit -m "feat(web3/server): add getSession RSC helper"
```

---

## Phase 3 — API routes

### Task 3.1: `POST /api/auth/nonce`

**Files:**
- Create: `app/api/auth/nonce/route.ts`
- Create: `app/api/auth/nonce/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// app/api/auth/nonce/route.test.ts
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'

function buildReq(body: unknown, ip = '127.0.0.1'): NextRequest {
  return new NextRequest('http://localhost/api/auth/nonce', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/nonce', () => {
  it('returns 200 with a nonce and sets siwe_nonce cookie for a valid address', async () => {
    const res = await POST(buildReq({ address: ADDR }, '10.0.0.1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nonce).toMatch(/^[0-9a-f]{32}$/)
    const cookie = res.cookies.get('siwe_nonce')
    expect(cookie?.value).toBeTruthy()
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
  })

  it('returns 400 invalid_address for a bad address', async () => {
    const res = await POST(buildReq({ address: 'not-an-address' }, '10.0.0.2'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_address' })
  })

  it('returns 400 invalid_body when address missing', async () => {
    const res = await POST(buildReq({}, '10.0.0.3'))
    expect(res.status).toBe(400)
  })

  it('rate limits the 11th request from the same IP within the window', async () => {
    const ip = '10.0.0.4'
    for (let i = 0; i < 10; i++) {
      const ok = await POST(buildReq({ address: ADDR }, ip))
      expect(ok.status).toBe(200)
    }
    const blocked = await POST(buildReq({ address: ADDR }, ip))
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ error: 'rate_limited' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- app/api/auth/nonce/route.test.ts
```

Expected: import error.

- [ ] **Step 3: Create `app/api/auth/nonce/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { isAddress, getAddress } from 'viem'
import { issueNonce, NONCE_COOKIE, NONCE_TTL_SECONDS } from '@/lib/web3/server/nonce'
import type { Address } from '@/lib/web3/types'

const BodySchema = z.object({
  address: z.string().refine(isAddress, 'invalid_address'),
})

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function allow(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (bucket.count >= RATE_LIMIT) return false
  bucket.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_address' }, { status: 400 })
  }

  const address = getAddress(parsed.data.address) as Address
  const { nonce, cookieValue } = await issueNonce(address)

  const res = NextResponse.json({ nonce })
  res.cookies.set(NONCE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: NONCE_TTL_SECONDS,
  })
  return res
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- app/api/auth/nonce/route.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/nonce/route.ts app/api/auth/nonce/route.test.ts
git commit -m "feat(api/auth): add POST /api/auth/nonce"
```

---

### Task 3.2: `POST /api/auth/verify`

**Files:**
- Create: `app/api/auth/verify/route.ts`
- Create: `app/api/auth/verify/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// app/api/auth/verify/route.test.ts
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { POST } from './route'
import { issueNonce } from '@/lib/web3/server/nonce'
import { buildSiweMessage } from '@/lib/web3/siwe'

const SIGNER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const
const account = privateKeyToAccount(SIGNER_KEY)
const ADDR = account.address

async function setupSignedSession(opts: { chainId?: number; nonceOverride?: string; addressOverride?: `0x${string}`; issuedAtOverride?: string; domainOverride?: string } = {}) {
  const { nonce, cookieValue } = await issueNonce(ADDR)
  const usedNonce = opts.nonceOverride ?? nonce
  const usedAddress = opts.addressOverride ?? ADDR
  const message = buildSiweMessage({
    domain: opts.domainOverride ?? 'localhost',
    address: usedAddress,
    uri: 'http://localhost',
    chainId: opts.chainId ?? 1,
    nonce: usedNonce,
    issuedAt: opts.issuedAtOverride ?? new Date().toISOString(),
    statement: 'Sign in to Aura.',
  })
  const signature = await account.signMessage({ message })
  return { message, signature, cookieValue }
}

function buildReq(body: unknown, cookieValue?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json', host: 'localhost' }
  if (cookieValue) headers['cookie'] = `siwe_nonce=${cookieValue}`
  return new NextRequest('http://localhost/api/auth/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/verify', () => {
  it('returns 200 + sets session cookie on valid signature', async () => {
    const { message, signature, cookieValue } = await setupSignedSession()
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ address: ADDR, chainId: 1 })
    expect(res.cookies.get('session')?.value).toBeTruthy()
    expect(res.cookies.get('siwe_nonce')?.value).toBe('')
  })

  it('returns 401 signature_invalid when signature is from a different key', async () => {
    const { message, cookieValue } = await setupSignedSession()
    const otherAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
    const wrongSig = await otherAccount.signMessage({ message })
    const res = await POST(buildReq({ message, signature: wrongSig }, cookieValue))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'signature_invalid' })
  })

  it('returns 400 chain_mismatch on wrong chainId', async () => {
    const { message, signature, cookieValue } = await setupSignedSession({ chainId: 10 })
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'chain_mismatch' })
  })

  it('returns 410 nonce_expired when cookie absent', async () => {
    const { message, signature } = await setupSignedSession()
    const res = await POST(buildReq({ message, signature }))
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'nonce_expired' })
  })

  it('returns 400 nonce_mismatch on cookie/message nonce divergence', async () => {
    const { message, signature, cookieValue } = await setupSignedSession({ nonceOverride: 'b'.repeat(32) })
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'nonce_mismatch' })
  })

  it('returns 400 domain_mismatch when message domain differs from request host', async () => {
    const { message, signature, cookieValue } = await setupSignedSession({ domainOverride: 'evil.example' })
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'domain_mismatch' })
  })

  it('returns 400 issued_at_skew when message is too old', async () => {
    const oldIssuedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { message, signature, cookieValue } = await setupSignedSession({ issuedAtOverride: oldIssuedAt })
    const res = await POST(buildReq({ message, signature }, cookieValue))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'issued_at_skew' })
  })

  it('returns 400 invalid_body on malformed json', async () => {
    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- app/api/auth/verify/route.test.ts
```

Expected: import error.

- [ ] **Step 3: Create `app/api/auth/verify/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAddress, verifyMessage } from 'viem'
import { parseSiweMessage } from '@/lib/web3/siwe'
import { consumeNonceCookie, NONCE_COOKIE } from '@/lib/web3/server/nonce'
import { signSession } from '@/lib/web3/server/session'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'
import { readServerEnv } from '@/lib/web3/env'
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains'
import type { Address } from '@/lib/web3/types'

const BodySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
})

const ISSUED_AT_SKEW_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { message, signature } = parsed.data

  const cookieValue = req.cookies.get(NONCE_COOKIE)?.value
  if (!cookieValue) {
    return NextResponse.json({ error: 'nonce_expired' }, { status: 410 })
  }
  const nonceData = await consumeNonceCookie(cookieValue)
  if (!nonceData) {
    return NextResponse.json({ error: 'nonce_expired' }, { status: 410 })
  }

  let parsedMessage
  try {
    parsedMessage = parseSiweMessage(message)
  } catch {
    return NextResponse.json({ error: 'invalid_siwe_message' }, { status: 400 })
  }

  if (parsedMessage.nonce !== nonceData.nonce) {
    return NextResponse.json({ error: 'nonce_mismatch' }, { status: 400 })
  }
  if (getAddress(parsedMessage.address) !== nonceData.address) {
    return NextResponse.json({ error: 'address_mismatch' }, { status: 400 })
  }
  if (parsedMessage.chainId !== DEFAULT_CHAIN_ID) {
    return NextResponse.json({ error: 'chain_mismatch' }, { status: 400 })
  }

  const host = req.headers.get('host')
  if (host && parsedMessage.domain !== host) {
    return NextResponse.json({ error: 'domain_mismatch' }, { status: 400 })
  }

  const issuedAt = new Date(parsedMessage.issuedAt).getTime()
  if (!issuedAt || Math.abs(Date.now() - issuedAt) > ISSUED_AT_SKEW_MS) {
    return NextResponse.json({ error: 'issued_at_skew' }, { status: 400 })
  }

  const isValid = await verifyMessage({
    address: nonceData.address,
    message,
    signature: signature as `0x${string}`,
  })
  if (!isValid) {
    return NextResponse.json({ error: 'signature_invalid' }, { status: 401 })
  }

  const jwt = await signSession({ address: nonceData.address, chainId: parsedMessage.chainId })
  const { sessionTtl } = readServerEnv()

  const res = NextResponse.json({ address: nonceData.address as Address, chainId: parsedMessage.chainId })
  res.cookies.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionTtl,
  })
  res.cookies.set(NONCE_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- app/api/auth/verify/route.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 5: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/verify/route.ts app/api/auth/verify/route.test.ts
git commit -m "feat(api/auth): add POST /api/auth/verify with SIWE verification"
```

---

### Task 3.3: `GET /api/auth/me`

**Files:**
- Create: `app/api/auth/me/route.ts`
- Create: `app/api/auth/me/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// app/api/auth/me/route.test.ts
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { signSession } from '@/lib/web3/server/session'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' as const

function buildReq(cookieHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (cookieHeader) headers['cookie'] = cookieHeader
  return new NextRequest('http://localhost/api/auth/me', { headers })
}

describe('GET /api/auth/me', () => {
  it('returns 200 with address and chainId for a valid session cookie', async () => {
    const jwt = await signSession({ address: ADDR, chainId: 1 })
    const res = await GET(buildReq(`session=${jwt}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ address: ADDR, chainId: 1 })
  })

  it('returns 401 when no cookie present', async () => {
    const res = await GET(buildReq())
    expect(res.status).toBe(401)
  })

  it('returns 401 on invalid JWT', async () => {
    const res = await GET(buildReq('session=not.a.real.jwt'))
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- app/api/auth/me/route.test.ts
```

Expected: import error.

- [ ] **Step 3: Create `app/api/auth/me/route.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifySession } from '@/lib/web3/server/session'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return new NextResponse(null, { status: 401 })
  const session = await verifySession(token)
  if (!session) return new NextResponse(null, { status: 401 })
  return NextResponse.json({ address: session.address, chainId: session.chainId })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- app/api/auth/me/route.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/me/route.ts app/api/auth/me/route.test.ts
git commit -m "feat(api/auth): add GET /api/auth/me"
```

---

### Task 3.4: `POST /api/auth/logout`

**Files:**
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/logout/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// app/api/auth/logout/route.test.ts
import { describe, expect, it } from 'vitest'
import { POST } from './route'

describe('POST /api/auth/logout', () => {
  it('returns 204 and clears session cookie', async () => {
    const res = await POST()
    expect(res.status).toBe(204)
    const cookie = res.cookies.get('session')
    expect(cookie?.value).toBe('')
    expect(cookie?.maxAge).toBe(0)
  })

  it('is idempotent (multiple calls succeed identically)', async () => {
    const a = await POST()
    const b = await POST()
    expect(a.status).toBe(204)
    expect(b.status).toBe(204)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- app/api/auth/logout/route.test.ts
```

Expected: import error.

- [ ] **Step 3: Create `app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'

export async function POST() {
  const res = new NextResponse(null, { status: 204 })
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- app/api/auth/logout/route.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/logout/route.ts app/api/auth/logout/route.test.ts
git commit -m "feat(api/auth): add POST /api/auth/logout"
```

---

## Phase 4 — Middleware

### Task 4.1: `/dashboard` guard

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifySession } from '@/lib/web3/server/session'
import { SESSION_COOKIE } from '@/lib/web3/server/getSession'

export const config = {
  matcher: ['/dashboard/:path*'],
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/connect'
    url.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Smoke test the redirect**

Run `npm run dev` in the background. From another shell:

```bash
curl -i http://localhost:3000/dashboard
```

Expected: HTTP `307` (or `308`) redirect; `Location` header is `/connect?redirectTo=%2Fdashboard`.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat(middleware): gate /dashboard behind session"
```

---

## Phase 5 — Client provider boundary

### Task 5.1: wagmi and AppKit instantiation

**Files:**
- Create: `lib/web3/wagmi.ts`
- Create: `lib/web3/appkit.ts`

- [ ] **Step 1: Create `lib/web3/wagmi.ts`**

```ts
import { http } from 'wagmi'
import { mainnet } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { readPublicEnv } from './env'

const { wcProjectId, rpcUrl } = readPublicEnv()

export const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId: wcProjectId,
  ssr: true,
  transports: { [mainnet.id]: http(rpcUrl) },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
```

- [ ] **Step 2: Create `lib/web3/appkit.ts`**

```ts
'use client'

import { createAppKit } from '@reown/appkit'
import { mainnet } from '@reown/appkit/networks'
import { wagmiAdapter } from './wagmi'
import { readPublicEnv } from './env'

let modal: ReturnType<typeof createAppKit> | undefined

export function getAppKit() {
  if (modal) return modal
  const { wcProjectId } = readPublicEnv()
  modal = createAppKit({
    adapters: [wagmiAdapter],
    networks: [mainnet],
    projectId: wcProjectId,
    metadata: {
      name: 'Aura',
      description: 'Your on-chain wealth, now in the real world.',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://aura.local',
      icons: ['/logo.svg'],
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#7C5CFF',
      '--w3m-color-mix': '#7C5CFF',
      '--w3m-color-mix-strength': 10,
      '--w3m-border-radius-master': '4px',
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
  })
  return modal
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add lib/web3/wagmi.ts lib/web3/appkit.ts
git commit -m "feat(web3): wire wagmi adapter and Reown AppKit"
```

---

### Task 5.2: React provider wrapper and root layout

**Files:**
- Create: `lib/web3/providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `lib/web3/providers.tsx`**

```tsx
'use client'

import { useState, type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './wagmi'
import { getAppKit } from './appkit'

if (typeof window !== 'undefined') {
  getAppKit()
}

export function Web3Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

- [ ] **Step 2: Modify `app/layout.tsx`**

Replace its full content with:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuroraBackground } from '@/components/layout/AuroraBackground'
import { Web3Providers } from '@/lib/web3/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Aura — Your on-chain wealth, now in the real world',
  description: 'The first luxury credit card backed by your crypto.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-background text-text-primary antialiased min-h-screen relative">
        <AuroraBackground />
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: Smoke test**

Start `npm run dev`. Open `http://localhost:3000`. Confirm the landing renders normally (no console errors related to wagmi or AppKit). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add lib/web3/providers.tsx app/layout.tsx
git commit -m "feat(web3): mount Web3Providers at root layout"
```

---

## Phase 6 — Client hooks

### Task 6.1: `useSession`

**Files:**
- Create: `lib/web3/hooks/useSession.ts`

- [ ] **Step 1: Create `lib/web3/hooks/useSession.ts`**

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address, SessionState } from '@/lib/web3/types'

interface MeResponse { address: Address; chainId: number }

async function fetchSession(): Promise<MeResponse | null> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error('me_failed')
  return res.json() as Promise<MeResponse>
}

export function useSession(): SessionState {
  const { data, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
  if (isLoading) return { status: 'loading' }
  if (!data) return { status: 'unauthenticated' }
  return { status: 'authenticated', address: data.address, chainId: data.chainId }
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add lib/web3/hooks/useSession.ts
git commit -m "feat(web3/hooks): add useSession backed by /api/auth/me"
```

---

### Task 6.2: `useDisconnect`

**Files:**
- Create: `lib/web3/hooks/useDisconnect.ts`

- [ ] **Step 1: Create `lib/web3/hooks/useDisconnect.ts`**

```ts
'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useDisconnect as useWagmiDisconnect } from 'wagmi'

export function useDisconnect() {
  const queryClient = useQueryClient()
  const { disconnect } = useWagmiDisconnect()

  return async function logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {
      // server unreachable — proceed with client-side disconnect anyway
    }
    disconnect()
    await queryClient.invalidateQueries({ queryKey: ['session'] })
  }
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add lib/web3/hooks/useDisconnect.ts
git commit -m "feat(web3/hooks): add useDisconnect"
```

---

### Task 6.3: `useSiweLogin`

**Files:**
- Create: `lib/web3/hooks/useSiweLogin.ts`

- [ ] **Step 1: Create `lib/web3/hooks/useSiweLogin.ts`**

```ts
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignMessage, useSwitchChain } from 'wagmi'
import { getAccount } from 'wagmi/actions'
import { useQueryClient } from '@tanstack/react-query'
import { getAppKit } from '@/lib/web3/appkit'
import { wagmiConfig } from '@/lib/web3/wagmi'
import { buildSiweMessage } from '@/lib/web3/siwe'
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains'
import type { Address, SiweLoginState } from '@/lib/web3/types'

export type WalletId = 'walletconnect' | 'metamask' | 'coinbase' | 'rainbow'

export interface UseSiweLoginReturn {
  state: SiweLoginState
  start: (walletId: WalletId, redirectTo?: string) => Promise<void>
  reset: () => void
}

const CONNECT_TIMEOUT_MS = 60_000

function waitForConnection(timeoutMs: number): Promise<{ address: Address; chainId: number } | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      const acc = getAccount(wagmiConfig)
      if (acc.status === 'connected' && acc.address) {
        resolve({ address: acc.address as Address, chainId: acc.chainId ?? DEFAULT_CHAIN_ID })
        return
      }
      if (Date.now() - start > timeoutMs) {
        resolve(null)
        return
      }
      setTimeout(tick, 200)
    }
    tick()
  })
}

export function useSiweLogin(): UseSiweLoginReturn {
  const [state, setState] = useState<SiweLoginState>({ status: 'idle' })
  const { signMessageAsync } = useSignMessage()
  const { switchChainAsync } = useSwitchChain()
  const router = useRouter()
  const queryClient = useQueryClient()
  const inFlight = useRef(false)

  async function start(_walletId: WalletId, redirectTo: string = '/dashboard'): Promise<void> {
    if (inFlight.current) return
    inFlight.current = true
    try {
      setState({ status: 'connecting' })
      getAppKit().open()
      const connected = await waitForConnection(CONNECT_TIMEOUT_MS)
      if (!connected) {
        setState({ status: 'error', error: 'user_rejected_connect' })
        return
      }
      let { address, chainId } = connected

      if (chainId !== DEFAULT_CHAIN_ID) {
        try {
          await switchChainAsync({ chainId: DEFAULT_CHAIN_ID })
          chainId = DEFAULT_CHAIN_ID
        } catch {
          setState({ status: 'error', error: 'wrong_chain' })
          return
        }
      }

      setState({ status: 'requesting_nonce' })
      let nonceRes: Response
      try {
        nonceRes = await fetch('/api/auth/nonce', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ address }),
        })
      } catch {
        setState({ status: 'error', error: 'network_error' })
        return
      }
      if (!nonceRes.ok) {
        setState({ status: 'error', error: 'nonce_failed' })
        return
      }
      const { nonce } = (await nonceRes.json()) as { nonce: string }

      const message = buildSiweMessage({
        domain: window.location.host,
        address,
        uri: window.location.origin,
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
        statement: 'Sign in to Aura.',
      })

      setState({ status: 'awaiting_signature' })
      let signature: `0x${string}`
      try {
        signature = await signMessageAsync({ message, account: address })
      } catch {
        setState({ status: 'error', error: 'user_rejected_signature' })
        return
      }

      setState({ status: 'verifying' })
      let verifyRes: Response
      try {
        verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ message, signature }),
        })
      } catch {
        setState({ status: 'error', error: 'network_error' })
        return
      }
      if (!verifyRes.ok) {
        setState({ status: 'error', error: 'verify_failed' })
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['session'] })
      setState({ status: 'success', address })
      router.push(redirectTo)
    } finally {
      inFlight.current = false
    }
  }

  function reset(): void {
    setState({ status: 'idle' })
  }

  return { state, start, reset }
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add lib/web3/hooks/useSiweLogin.ts
git commit -m "feat(web3/hooks): add useSiweLogin SIWE orchestrator"
```

---

## Phase 7 — UI integration

### Task 7.1: Update `WalletPicker` with real SIWE flow

**Files:**
- Modify: `components/connect/WalletPicker.tsx` (full rewrite)

- [ ] **Step 1: Replace `components/connect/WalletPicker.tsx`**

```tsx
'use client'

import Image from 'next/image'
import { ChevronRight, Loader2, Lock } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'
import { useSiweLogin, type WalletId } from '@/lib/web3/hooks/useSiweLogin'
import type { SiweLoginError, SiweLoginState } from '@/lib/web3/types'

interface WalletOptionConfig {
  id: WalletId
  name: string
  iconSrc: string
  highlighted?: boolean
}

const wallets: WalletOptionConfig[] = [
  { id: 'walletconnect', name: 'WalletConnect',  iconSrc: '/wallets/walletconnect.svg', highlighted: true },
  { id: 'metamask',      name: 'MetaMask',       iconSrc: '/wallets/metamask.svg' },
  { id: 'coinbase',      name: 'Coinbase Wallet',iconSrc: '/wallets/coinbase.svg' },
  { id: 'rainbow',       name: 'Rainbow',        iconSrc: '/wallets/rainbow.svg' },
]

const errorCopy: Record<SiweLoginError, string> = {
  user_rejected_connect:   "Connection cancelled. Try again when you're ready.",
  user_rejected_signature: "Sign-in cancelled. We need the signature to log you in.",
  wrong_chain:             'Switch to Ethereum mainnet and try again.',
  nonce_failed:            'Could not start sign-in. Try again.',
  verify_failed:           'Sign-in failed. Try again.',
  network_error:           'Network error. Check your connection and try again.',
}

const inFlightCopy: Partial<Record<SiweLoginState['status'], string>> = {
  connecting:         'Connecting…',
  requesting_nonce:   'Preparing sign-in…',
  awaiting_signature: 'Sign in your wallet…',
  verifying:          'Verifying…',
}

interface WalletPickerProps {
  redirectTo?: string
}

export function WalletPicker({ redirectTo = '/dashboard' }: WalletPickerProps) {
  const { state, start } = useSiweLogin()
  const busy = state.status === 'connecting'
    || state.status === 'requesting_nonce'
    || state.status === 'awaiting_signature'
    || state.status === 'verifying'

  return (
    <Panel rounded="xl" className="w-full max-w-[480px] overflow-hidden">
      <div className="flex flex-col gap-stack-md p-stack-lg">
        <div className="text-center">
          <h1 className="mb-1 text-headline-md text-text-primary">Connect your wallet</h1>
          <p className="text-body-md text-text-secondary">Choose how to connect to Aura.</p>
        </div>
        <div className="mt-stack-md flex flex-col gap-stack-sm">
          {wallets.map(wallet => (
            <WalletOption
              key={wallet.id}
              wallet={wallet}
              busy={busy}
              onClick={() => { void start(wallet.id, redirectTo) }}
            />
          ))}
        </div>
        {busy && inFlightCopy[state.status] && (
          <p className="text-center text-label-sm text-aurora-violet" role="status">
            {inFlightCopy[state.status]}
          </p>
        )}
        {state.status === 'error' && (
          <p className="text-center text-label-sm text-red-400" role="alert">
            {errorCopy[state.error]}
          </p>
        )}
        <div className="mt-stack-lg flex items-center justify-center gap-2 border-t border-glass-border pt-stack-md">
          <Lock className="h-4 w-4 text-aurora-teal" />
          <p className="text-label-sm text-text-secondary">
            Secure connection. We never ask for your private key.
          </p>
        </div>
      </div>
    </Panel>
  )
}

interface WalletOptionProps {
  wallet: WalletOptionConfig
  busy: boolean
  onClick: () => void
}

function WalletOption({ wallet, busy, onClick }: WalletOptionProps) {
  const base = 'group flex w-full items-center justify-between rounded-lg p-4 transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
  const highlightStyles = wallet.highlighted
    ? 'border border-aurora-violet/30 bg-aurora-violet/10 hover:bg-aurora-violet/20'
    : 'border border-transparent bg-white/5 hover:border-glass-border hover:bg-white/10'

  return (
    <button type="button" onClick={onClick} disabled={busy} className={`${base} ${highlightStyles}`}>
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
          <Image src={wallet.iconSrc} alt="" width={24} height={24} aria-hidden />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span className="text-label-md text-text-primary">{wallet.name}</span>
          {wallet.highlighted && <Chip tone="teal">Recommended</Chip>}
        </div>
      </div>
      {busy
        ? <Loader2 className="h-5 w-5 animate-spin text-aurora-violet" />
        : <ChevronRight className="h-5 w-5 text-text-secondary transition-transform group-hover:translate-x-1" />}
    </button>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add components/connect/WalletPicker.tsx
git commit -m "feat(connect): wire WalletPicker to useSiweLogin with state UI"
```

---

### Task 7.2: Sidebar Disconnect button and MobileTabBar update

**Files:**
- Modify: `components/layout/Sidebar.tsx` (full rewrite)
- Modify: `components/layout/MobileTabBar.tsx` (full rewrite)

- [ ] **Step 1: Replace `components/layout/Sidebar.tsx`**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Copy, CreditCard, LayoutDashboard, LogOut, Wallet } from 'lucide-react'
import { useDisconnect } from '@/lib/web3/hooks/useDisconnect'
import type { WalletSession } from '@/lib/web3/types'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', active: true },
  { label: 'Card',     icon: CreditCard,      href: '#',          active: false },
  { label: 'Wallet',   icon: Wallet,          href: '#',          active: false },
]

export function Sidebar({ wallet }: { wallet: WalletSession }) {
  const logout = useDisconnect()
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-glass-border bg-glass-fill py-stack-lg shadow-lg shadow-black/20 backdrop-blur-xl lg:flex">
      <div className="mb-12 px-gutter">
        <Image src="/logo.svg" alt="Aura" width={48} height={48} className="rounded-md" />
      </div>
      <nav className="flex flex-grow flex-col gap-2">
        {navItems.map(({ label, icon: Icon, href, active }) => (
          <Link
            key={label}
            href={href}
            className={
              active
                ? 'flex translate-x-1 items-center gap-3 border-r-4 border-aurora-teal bg-aurora-violet/10 px-gutter py-3 text-text-primary'
                : 'flex items-center gap-3 px-gutter py-3 text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary'
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-label-md">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-stack-sm px-gutter">
        <div className="flex items-center justify-between rounded-lg border border-glass-border bg-glass-fill p-3 backdrop-blur-glass">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-aurora-teal shadow-glow-teal" />
            <span className="text-label-sm tracking-wider text-text-secondary">
              {wallet.addressShort}
            </span>
          </div>
          <button
            type="button"
            className="text-text-secondary hover:text-text-primary"
            aria-label="Copy wallet address"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => { void logout() }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-glass-border bg-glass-fill py-2 text-label-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Replace `components/layout/MobileTabBar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { CreditCard, LayoutDashboard, LogOut, Wallet } from 'lucide-react'
import { useDisconnect } from '@/lib/web3/hooks/useDisconnect'

const items = [
  { label: 'Home',   icon: LayoutDashboard, href: '/dashboard', active: true },
  { label: 'Card',   icon: CreditCard,      href: '#',          active: false },
  { label: 'Wallet', icon: Wallet,          href: '#',          active: false },
]

export function MobileTabBar() {
  const logout = useDisconnect()
  return (
    <footer className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-glass-border bg-glass-fill py-4 backdrop-blur-glass lg:hidden">
      {items.map(({ label, icon: Icon, href, active }) => (
        <Link
          key={label}
          href={href}
          className={`flex flex-col items-center gap-1 ${active ? 'text-aurora-teal' : 'text-text-secondary'}`}
        >
          <Icon className="h-5 w-5" />
          <span className={`text-[10px] ${active ? 'font-bold' : ''}`}>{label}</span>
        </Link>
      ))}
      <button
        type="button"
        onClick={() => { void logout() }}
        className="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-[10px]">Disconnect</span>
      </button>
    </footer>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add components/layout/Sidebar.tsx components/layout/MobileTabBar.tsx
git commit -m "feat(layout): add Disconnect to Sidebar and MobileTabBar"
```

---

### Task 7.3: `app/connect/page.tsx` reads `redirectTo`

**Files:**
- Modify: `app/connect/page.tsx` (full rewrite)

- [ ] **Step 1: Replace `app/connect/page.tsx`**

```tsx
import { BrandingAnchor } from '@/components/layout/BrandingAnchor'
import { WalletPicker } from '@/components/connect/WalletPicker'

export const metadata = {
  title: 'Connect your wallet — Aura',
}

interface ConnectPageProps {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function ConnectPage({ searchParams }: ConnectPageProps) {
  const { redirectTo } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center p-gutter">
      <WalletPicker redirectTo={redirectTo ?? '/dashboard'} />
      <BrandingAnchor />
    </main>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add app/connect/page.tsx
git commit -m "feat(connect): pass redirectTo from search params"
```

---

### Task 7.4: Dashboard reads session

**Files:**
- Modify: `app/dashboard/page.tsx` (full rewrite)

- [ ] **Step 1: Replace `app/dashboard/page.tsx`**

```tsx
'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ApprovalStepper } from '@/components/dashboard/ApprovalStepper'
import { EligibleBalancePanel } from '@/components/dashboard/EligibleBalancePanel'
import { EstimatedLimitPanel } from '@/components/dashboard/EstimatedLimitPanel'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { useDashboardMock } from '@/lib/mock/hooks'
import { useSession } from '@/lib/web3/hooks/useSession'
import { truncateAddress } from '@/lib/format'
import { getChainName } from '@/lib/web3/chains'
import type { WalletSession } from '@/lib/web3/types'

export default function DashboardPage() {
  const session = useSession()
  const data = useDashboardMock()

  if (session.status !== 'authenticated') return null

  const wallet: WalletSession = {
    address: session.address,
    addressShort: truncateAddress(session.address),
    chainId: session.chainId,
    chainName: getChainName(session.chainId),
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar wallet={wallet} />
      <main className="mx-auto w-full max-w-container-max flex-grow px-gutter py-stack-lg lg:ml-64 lg:px-margin-desktop">
        <DashboardHeader wallet={wallet} />
        <ApprovalStepper progress={data.progress} />
        <div className="mb-stack-lg grid grid-cols-1 gap-stack-lg md:grid-cols-2">
          <EligibleBalancePanel balance={data.balance} />
          <EstimatedLimitPanel  limit={data.limit} />
        </div>
        <ActivityTimeline events={data.timeline} />
      </main>
      <MobileTabBar />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): use real session for wallet, keep panels mocked"
```

---

### Task 7.5: Update `DashboardHeader` import path for `WalletSession`

**Files:**
- Modify: `components/dashboard/DashboardHeader.tsx`

- [ ] **Step 1: Edit the import line**

Change exactly:
```ts
import type { WalletSession } from '@/lib/mock/types'
```
to:
```ts
import type { WalletSession } from '@/lib/web3/types'
```

(The component body is unchanged.)

- [ ] **Step 2: Typecheck and lint**

```bash
npm run typecheck
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DashboardHeader.tsx
git commit -m "refactor(dashboard): import WalletSession from lib/web3/types"
```

---

## Phase 8 — Mock cleanup

### Task 8.1: Remove wallet mock surfaces and pull `Address` into web3

**Files:**
- Modify: `lib/mock/types.ts`
- Modify: `lib/mock/data.ts`
- Modify: `lib/mock/hooks.ts`
- Modify: `lib/format.ts`
- Modify: `lib/web3/types.ts`

- [ ] **Step 1: Move `Address` declaration into `lib/web3/types.ts`**

Replace the first two lines of `lib/web3/types.ts`:

```ts
import type { Address } from '@/lib/mock/types'

export type { Address }
```

with:

```ts
export type Address = `0x${string}`
```

The rest of `lib/web3/types.ts` stays unchanged.

- [ ] **Step 2: Rewrite `lib/mock/types.ts`**

```ts
import type { Address } from '@/lib/web3/types'

export type { Address }

export type AssetSymbol = 'BTC' | 'ETH' | 'USDC'

export interface AssetBalance {
  symbol: AssetSymbol
  name: string
  amountRaw: bigint
  decimals: number
  amountDisplay: string
  usdValue: number
}

export type StepStatus = 'completed' | 'in_progress' | 'pending'
export type StepId = 'wallet_connected' | 'asset_analysis' | 'approval' | 'card_issued'

export interface ApprovalStep {
  id: StepId
  label: string
  status: StepStatus
  caption: string
}

export interface ApprovalProgress {
  steps: ApprovalStep[]
  percent: number
  etaLabel: string
}

export interface EligibleBalance {
  totalUsd: number
  assets: AssetBalance[]
}

export interface EstimatedLimit {
  limitUsd: number
  utilizationPercent: number
  utilizationCaption: string
}

export type TimelineEventStatus = 'completed' | 'in_progress' | 'pending'

export interface TimelineEvent {
  id: string
  title: string
  description: string
  status: TimelineEventStatus
  timestamp: string
}

export interface DashboardData {
  progress: ApprovalProgress
  balance: EligibleBalance
  limit: EstimatedLimit
  timeline: TimelineEvent[]
}
```

(Removed: `WalletSession`, `wallet` field on `DashboardData`. The re-export of `Address` keeps existing mock-internal imports working.)

- [ ] **Step 3: Rewrite `lib/mock/data.ts`**

```ts
import type {
  ApprovalProgress,
  DashboardData,
  EligibleBalance,
  EstimatedLimit,
  TimelineEvent,
} from './types'

export const MOCK_PROGRESS: ApprovalProgress = {
  percent: 45,
  etaLabel: 'Estimated completion: ~2h',
  steps: [
    { id: 'wallet_connected', label: 'Wallet connected', status: 'completed',   caption: 'Completed' },
    { id: 'asset_analysis',   label: 'Asset analysis',   status: 'in_progress', caption: 'In progress' },
    { id: 'approval',         label: 'Approval',         status: 'pending',     caption: 'Pending' },
    { id: 'card_issued',      label: 'Card issued',      status: 'pending',     caption: 'Pending' },
  ],
}

export const MOCK_BALANCE: EligibleBalance = {
  totalUsd: 28_500,
  assets: [
    { symbol: 'BTC',  name: 'Bitcoin',  amountRaw: 45_000_000n,                  decimals: 8,  amountDisplay: '0.45',  usdValue: 18_900 },
    { symbol: 'ETH',  name: 'Ethereum', amountRaw: 12_800_000_000_000_000_000n, decimals: 18, amountDisplay: '12.8',  usdValue: 4_600 },
    { symbol: 'USDC', name: 'USDC',     amountRaw: 5_000_000_000n,              decimals: 6,  amountDisplay: '5,000', usdValue: 5_000 },
  ],
}

export const MOCK_LIMIT: EstimatedLimit = {
  limitUsd: 9_000,
  utilizationPercent: 70,
  utilizationCaption: '70% ideal utilization rate',
}

export const MOCK_TIMELINE: TimelineEvent[] = [
  { id: 'liquidity', title: 'Liquidity verification completed', description: 'Assets verified across 3 networks',         status: 'completed',   timestamp: '10:42 AM' },
  { id: 'score',     title: 'On-chain credit score',            description: 'Processing transactional history (EVM)',     status: 'in_progress', timestamp: 'Now' },
  { id: 'keys',      title: 'Cryptographic key generation',     description: 'Pending final approval',                     status: 'pending',     timestamp: '—' },
]

export const MOCK_DASHBOARD: DashboardData = {
  progress: MOCK_PROGRESS,
  balance:  MOCK_BALANCE,
  limit:    MOCK_LIMIT,
  timeline: MOCK_TIMELINE,
}
```

(Removed: `MOCK_WALLET`, the `wallet` field on `MOCK_DASHBOARD`.)

- [ ] **Step 4: Rewrite `lib/mock/hooks.ts`**

```ts
'use client'

import { MOCK_DASHBOARD } from './data'
import type { DashboardData } from './types'

export function useDashboardMock(): DashboardData {
  return MOCK_DASHBOARD
}
```

(Removed: `useWalletMock`.)

- [ ] **Step 5: Update `lib/format.ts` import path for `Address`**

Change:
```ts
import type { Address } from './mock/types'
```
to:
```ts
import type { Address } from './web3/types'
```

(Function bodies unchanged.)

- [ ] **Step 6: Verify nothing else still imports the deleted surfaces**

```bash
grep -r "useWalletMock\|MOCK_WALLET" app components lib
```

Expected: zero matches.

- [ ] **Step 7: Typecheck, lint, test**

```bash
npm run typecheck
npm run lint
npm test
```

All three must pass. The full test suite green is the proof we didn't break anything.

- [ ] **Step 8: Commit**

```bash
git add lib/web3/types.ts lib/mock/types.ts lib/mock/data.ts lib/mock/hooks.ts lib/format.ts
git commit -m "refactor(mock): remove wallet mocks; move Address into lib/web3"
```

---

## Phase 9 — Definition of done

### Task 9.1: Sprint 2 DoD sweep

This task is verification only — no new source files. Some checks may require a Reown project ID and an Alchemy URL in `.env.local`; if those aren't yet set, document the DoD entries that need manual completion.

- [ ] **Step 1: Confirm hook integrity**

```bash
git status .claude/hooks/block-unsafe-web3.sh
git log -- .claude/hooks/block-unsafe-web3.sh
```

Expected: unchanged since Sprint 0 baseline.

- [ ] **Step 2: Confirm no component imports raw wagmi/viem**

```bash
grep -rn "from 'wagmi\|from 'viem" components
```

Expected: zero matches. Components consume Web3 only via `@/lib/web3/hooks/*`.

- [ ] **Step 3: Confirm mock isolation**

```bash
grep -rn "from '@/lib/mock/data\|from '@/lib/mock/hooks" components
```

Expected: zero matches.

- [ ] **Step 4: Confirm wallet mocks removed**

```bash
grep -rn "useWalletMock\|MOCK_WALLET" .
```

Expected: matches only inside the spec/plan docs under `docs/superpowers/` describing the removal.

- [ ] **Step 5: Run the full DoD command set**

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Expected: all pass. `next build` lists `/`, `/connect`, `/dashboard`, `/api/auth/nonce`, `/api/auth/verify`, `/api/auth/me`, `/api/auth/logout`. `npm test` reports ≥ 15 tests passing.

- [ ] **Step 6: Smoke-test unauthenticated `/dashboard`**

```bash
npm run dev
curl -i http://localhost:3000/dashboard
```

Expected: 307 redirect with `Location: /connect?redirectTo=%2Fdashboard`.

- [ ] **Step 7: Smoke-test `/connect` renders**

```bash
curl -s http://localhost:3000/connect | grep -o "Connect your wallet"
```

Expected: one match.

- [ ] **Step 8: Smoke-test `/api/auth/me` unauthenticated**

```bash
curl -i -X GET http://localhost:3000/api/auth/me
```

Expected: 401.

- [ ] **Step 9: Smoke-test `/api/auth/logout` idempotency**

```bash
curl -i -X POST http://localhost:3000/api/auth/logout
curl -i -X POST http://localhost:3000/api/auth/logout
```

Expected: both 204.

Stop the dev server.

- [ ] **Step 10: Manual end-to-end smoke test (requires real env vars)**

Document for the user to perform once they fill in `.env.local`:

1. Set `NEXT_PUBLIC_WC_PROJECT_ID`, `NEXT_PUBLIC_RPC_URL`, `SESSION_SECRET`, `NONCE_SECRET` in `.env.local`.
2. `npm run dev`.
3. Open `http://localhost:3000` in a browser with MetaMask installed.
4. Click "Connect wallet" → land on `/connect`.
5. Click any wallet button → AppKit modal opens.
6. Choose MetaMask in the modal → approve connection → sign the SIWE message.
7. Confirm landing on `/dashboard`. The Sidebar wallet pill and DashboardHeader pill show the real, truncated address.
8. Click "Disconnect" in the Sidebar → confirm redirect back to `/connect`.
9. Try `http://localhost:3000/dashboard` directly without a session — confirm the middleware redirects to `/connect?redirectTo=/dashboard`.

If any of steps 4-9 fails, the implementer reports BLOCKED with the failure details — do not silently fix.

- [ ] **Step 11: Final commit if anything drifted**

```bash
git status
```

If clean (apart from the known stray `security.md` at the project root), no commit needed.

---

## Spec coverage check

| Spec section | Covered by task(s) |
|---|---|
| §1 Goals & non-custodial constraints | Enforced across all tasks; hook integrity checked in 9.1 |
| §2.1 Client layer (wagmi/AppKit/providers) | Tasks 5.1, 5.2 |
| §2.2 Server primitives | Tasks 2.1, 2.2, 2.3 |
| §2.3 Middleware | Task 4.1 |
| §2.4 End-to-end flow | Implemented across Phases 3, 5, 6, 7; verified manually in 9.1 step 10 |
| §3.1 `/api/auth/nonce` | Task 3.1 |
| §3.2 `/api/auth/verify` | Task 3.2 |
| §3.3 `/api/auth/me` | Task 3.3 |
| §3.4 `/api/auth/logout` | Task 3.4 |
| §3.5 Shared types | Task 1.1 |
| §4.1 New files | Tasks 0.3, 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 5.1, 5.2, 6.1, 6.2, 6.3 |
| §4.2 Edited files | Tasks 5.2 (layout), 7.1 (WalletPicker), 7.2 (Sidebar/MobileTabBar), 7.3 (connect/page), 7.4 (dashboard/page), 7.5 (DashboardHeader import), 8.1 (mock cleanup) |
| §5 `WalletSession` moves to lib/web3/types.ts | Task 1.1 (added) + Task 8.1 (deleted from mock) + Task 7.5 (imports updated) |
| §6 Error handling | Task 6.3 (state transitions) + Task 7.1 (UI copy) |
| §7 Environment | Task 0.3 |
| §8 Testing | TDD inside Tasks 0.3, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4 (test count ≥ 35, well above the spec's ≥ 15 minimum) |
| §9 Routing & navigation | Tasks 4.1, 7.3 |
| §10 Definition of done | Task 9.1 |
| §11 Out of scope | No tasks introduce these; verified by absence in 9.1 |
