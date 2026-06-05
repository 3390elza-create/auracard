# Cross-Chain USDC Zap — Plan 3 of 4: LI.FI Provider Adapter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A clean, SDK-agnostic `ZapProvider` port (quote → USDC on Polygon, **bounded** approval, execute with progress) — plus a pure status mapper and a fake provider for tests — and the live `LifiZapProvider` backed by `@lifi/sdk` + Circle CCTP.

**Architecture:** The rest of the app depends only on the `ZapProvider` interface and our normalized `ZapProgress`/`ZapQuote` types — never on `@lifi/sdk` directly. `LifiZapProvider` is the single file that touches the SDK; a `FakeZapProvider` lets Plan 4's orchestration be tested without any network. **Approvals are always bounded** (`setTokenAllowance({ infiniteApproval: false })` for the exact amount) — never `MaxUint256`/`setApprovalForAll`.

**Tech Stack:** TypeScript (strict), Vitest, `@lifi/sdk`, viem.

**Spec:** `docs/superpowers/specs/2026-06-05-cross-chain-usdc-zap-deposit-design.md`. **Depends on:** Plan 1 (`ZapChainId`, `NATIVE_SENTINEL`, `ZAP_DEST_CHAIN_ID`), vault config (`getUsdcAddress`).

**Security (non-negotiable):** the only on-chain authorization this plan issues is a **bounded** token allowance for the exact swap amount. The PreToolUse hook blocks `MaxUint256`/`setApprovalForAll`; do not write them. No `eth_sign`.

---

## File Structure
- Create: `lib/web3/zap/provider.ts` — `ZapProvider` interface + normalized types + pure `normalizeLifiProcess` mapper.
- Create: `lib/web3/zap/provider.test.ts` — tests for the pure mapper.
- Create: `lib/web3/zap/fakeProvider.ts` — `FakeZapProvider` (scripted, for downstream tests).
- Create: `lib/web3/zap/fakeProvider.test.ts`.
- Create: `lib/web3/zap/lifiProvider.ts` — live `LifiZapProvider` (only file importing `@lifi/sdk`).
- Create: `lib/web3/zap/lifiProvider.test.ts` — mocked-SDK tests; asserts bounded approval.
- Modify: `package.json` — add `@lifi/sdk` dependency.

---

### Task 1: Port interface, normalized types, pure status mapper

**Files:** Create `lib/web3/zap/provider.ts` and `lib/web3/zap/provider.test.ts`.

- [ ] **Step 1: Write the failing tests** — Create `lib/web3/zap/provider.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeLifiProcess } from './provider'

describe('normalizeLifiProcess', () => {
  it('maps LI.FI process types to zap step kinds', () => {
    expect(normalizeLifiProcess('TOKEN_ALLOWANCE', 'STARTED')?.kind).toBe('approval')
    expect(normalizeLifiProcess('SWAP', 'PENDING')?.kind).toBe('swap')
    expect(normalizeLifiProcess('CROSS_CHAIN', 'PENDING')?.kind).toBe('bridge')
    expect(normalizeLifiProcess('RECEIVING_CHAIN', 'DONE')?.kind).toBe('receive')
  })

  it('maps LI.FI statuses to zap step statuses', () => {
    expect(normalizeLifiProcess('SWAP', 'STARTED')?.status).toBe('started')
    expect(normalizeLifiProcess('SWAP', 'ACTION_REQUIRED')?.status).toBe('started')
    expect(normalizeLifiProcess('SWAP', 'PENDING')?.status).toBe('pending')
    expect(normalizeLifiProcess('SWAP', 'DONE')?.status).toBe('done')
    expect(normalizeLifiProcess('SWAP', 'FAILED')?.status).toBe('failed')
  })

  it('carries the tx hash when present', () => {
    expect(normalizeLifiProcess('SWAP', 'DONE', '0xfeed')?.txHash).toBe('0xfeed')
  })

  it('returns null for unknown process types or statuses', () => {
    expect(normalizeLifiProcess('SOMETHING_ELSE', 'DONE')).toBeNull()
    expect(normalizeLifiProcess('SWAP', 'WEIRD')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run lib/web3/zap/provider.test.ts` → FAIL.

- [ ] **Step 3: Implement** — Create `lib/web3/zap/provider.ts`:

```ts
import type { ZapChainId } from './types'

// Normalized, SDK-agnostic progress the provider emits as a route executes.
export type ZapStepKind = 'approval' | 'swap' | 'bridge' | 'receive'
export type ZapStepStatus = 'started' | 'pending' | 'done' | 'failed'

export interface ZapProgress {
  kind: ZapStepKind
  status: ZapStepStatus
  txHash?: string
}

export interface ZapQuoteParams {
  fromChainId: ZapChainId
  fromTokenAddress: string // NATIVE_SENTINEL for native
  fromAmount: string // exact input, base units
  fromAddress: string
  isNative: boolean
}

export interface ZapQuote {
  fromChainId: ZapChainId
  fromTokenAddress: string
  fromAmount: string // exact input, base units
  approvalAddress: string | null // bounded-approval spender; null when native / none needed
  estToAmount: string // estimated USDC out, base units (6dp)
  isNative: boolean
  raw: unknown // provider-native route/quote, opaque to callers
}

export interface ZapExecuteParams {
  quote: ZapQuote
  onProgress: (p: ZapProgress) => void
}

export interface ZapExecuteResult {
  destTxHash?: string // tx that delivered USDC on Polygon
}

// The boundary the rest of the app depends on. Implemented live by LifiZapProvider
// and by FakeZapProvider in tests.
export interface ZapProvider {
  quote(params: ZapQuoteParams): Promise<ZapQuote>
  // Bounded approval for the exact amount; returns the approval tx hash, or null
  // when none is needed (native token, or allowance already sufficient).
  approveExact(quote: ZapQuote): Promise<string | null>
  execute(params: ZapExecuteParams): Promise<ZapExecuteResult>
}

const KIND_BY_TYPE: Record<string, ZapStepKind> = {
  TOKEN_ALLOWANCE: 'approval',
  SWAP: 'swap',
  CROSS_CHAIN: 'bridge',
  RECEIVING_CHAIN: 'receive',
}

const STATUS_BY_LIFI: Record<string, ZapStepStatus> = {
  STARTED: 'started',
  ACTION_REQUIRED: 'started',
  PENDING: 'pending',
  DONE: 'done',
  FAILED: 'failed',
}

/**
 * Pure: translate a LI.FI execution process (type + status) into normalized zap
 * progress. Returns null for process types/statuses we don't surface.
 */
export function normalizeLifiProcess(type: string, status: string, txHash?: string): ZapProgress | null {
  const kind = KIND_BY_TYPE[type]
  const normStatus = STATUS_BY_LIFI[status]
  if (!kind || !normStatus) return null
  return txHash ? { kind, status: normStatus, txHash } : { kind, status: normStatus }
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run lib/web3/zap/provider.test.ts` → PASS (4 tests).

- [ ] **Step 5: Type-check & commit**

Run: `npm run typecheck` → clean.

```bash
git add lib/web3/zap/provider.ts lib/web3/zap/provider.test.ts
git commit -m "feat(zap): SDK-agnostic ZapProvider port + pure LI.FI status mapper"
```

---

### Task 2: FakeZapProvider for downstream tests

**Files:** Create `lib/web3/zap/fakeProvider.ts` and `lib/web3/zap/fakeProvider.test.ts`.

- [ ] **Step 1: Write the failing tests** — Create `lib/web3/zap/fakeProvider.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { FakeZapProvider } from './fakeProvider'
import type { ZapProgress, ZapQuoteParams } from './provider'

const params: ZapQuoteParams = {
  fromChainId: 42161,
  fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  fromAmount: '1000000',
  fromAddress: '0xUSER',
  isNative: false,
}

describe('FakeZapProvider', () => {
  it('quotes with a configurable estimated output and approval address', async () => {
    const p = new FakeZapProvider({ estToAmount: '990000', approvalAddress: '0xSPENDER' })
    const quote = await p.quote(params)
    expect(quote.fromAmount).toBe('1000000')
    expect(quote.estToAmount).toBe('990000')
    expect(quote.approvalAddress).toBe('0xSPENDER')
  })

  it('returns null approval for a native quote', async () => {
    const p = new FakeZapProvider({})
    const quote = await p.quote({ ...params, isNative: true, fromTokenAddress: '0x0000000000000000000000000000000000000000' })
    expect(await p.approveExact(quote)).toBeNull()
  })

  it('returns an approval hash for a non-native quote', async () => {
    const p = new FakeZapProvider({ approvalTxHash: '0xapprove' })
    const quote = await p.quote(params)
    expect(await p.approveExact(quote)).toBe('0xapprove')
  })

  it('emits the scripted progress sequence and resolves with the dest tx hash', async () => {
    const script: ZapProgress[] = [
      { kind: 'swap', status: 'done', txHash: '0xswap' },
      { kind: 'bridge', status: 'done', txHash: '0xbridge' },
      { kind: 'receive', status: 'done' },
    ]
    const p = new FakeZapProvider({ progress: script, destTxHash: '0xdeposit-src' })
    const seen: ZapProgress[] = []
    const result = await p.execute({ quote: await p.quote(params), onProgress: (e) => seen.push(e) })
    expect(seen).toEqual(script)
    expect(result.destTxHash).toBe('0xdeposit-src')
  })

  it('rejects execute when configured to fail', async () => {
    const p = new FakeZapProvider({ failExecute: 'boom' })
    await expect(p.execute({ quote: await p.quote(params), onProgress: () => {} })).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run lib/web3/zap/fakeProvider.test.ts` → FAIL.

- [ ] **Step 3: Implement** — Create `lib/web3/zap/fakeProvider.ts`:

```ts
import { NATIVE_SENTINEL } from './types'
import type {
  ZapExecuteParams,
  ZapExecuteResult,
  ZapProgress,
  ZapProvider,
  ZapQuote,
  ZapQuoteParams,
} from './provider'

export interface FakeZapConfig {
  estToAmount?: string
  approvalAddress?: string
  approvalTxHash?: string | null
  progress?: ZapProgress[]
  destTxHash?: string
  failExecute?: string
}

// Deterministic in-memory ZapProvider for tests: no network, scripted progress.
export class FakeZapProvider implements ZapProvider {
  constructor(private readonly config: FakeZapConfig) {}

  async quote(params: ZapQuoteParams): Promise<ZapQuote> {
    return {
      fromChainId: params.fromChainId,
      fromTokenAddress: params.fromTokenAddress,
      fromAmount: params.fromAmount,
      approvalAddress: params.isNative ? null : (this.config.approvalAddress ?? '0xSPENDER'),
      estToAmount: this.config.estToAmount ?? params.fromAmount,
      isNative: params.isNative,
      raw: { fake: true },
    }
  }

  async approveExact(quote: ZapQuote): Promise<string | null> {
    if (quote.isNative || quote.fromTokenAddress === NATIVE_SENTINEL) return null
    return this.config.approvalTxHash ?? '0xapprove'
  }

  async execute(params: ZapExecuteParams): Promise<ZapExecuteResult> {
    if (this.config.failExecute) throw new Error(this.config.failExecute)
    for (const p of this.config.progress ?? []) params.onProgress(p)
    return { destTxHash: this.config.destTxHash }
  }
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run lib/web3/zap/fakeProvider.test.ts` → PASS (5 tests).

- [ ] **Step 5: Type-check & commit**

Run: `npm run typecheck` → clean.

```bash
git add lib/web3/zap/fakeProvider.ts lib/web3/zap/fakeProvider.test.ts
git commit -m "feat(zap): FakeZapProvider for deterministic downstream tests"
```

---

### Task 3: Install @lifi/sdk and implement the live LifiZapProvider

This is the only file that imports `@lifi/sdk`. **You MUST reconcile the exact call signatures and types with the installed version** of the SDK (read `node_modules/@lifi/sdk` types or its docs) — the code below uses the documented v3 API; adjust names/shapes if the installed version differs. **The bounded-approval invariant is fixed and must not change:** `setTokenAllowance` is called with `infiniteApproval: false` and the exact `amount`; never `MaxUint256`/`setApprovalForAll`.

**Files:** Create `lib/web3/zap/lifiProvider.ts` and `lib/web3/zap/lifiProvider.test.ts`. Modify `package.json` (via `npm install`).

- [ ] **Step 1: Install the SDK**

Run: `npm install @lifi/sdk`
Expected: `package.json` + lockfile updated; no peer-dep errors that block install (`@lifi/sdk` peers on `viem`, already present).

- [ ] **Step 2: Write the failing test (mocked SDK)** — Create `lib/web3/zap/lifiProvider.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock the SDK surface the provider uses.
const getQuote = vi.fn()
const convertQuoteToRoute = vi.fn((q: unknown) => ({ route: q }))
const executeRoute = vi.fn()
const setTokenAllowance = vi.fn()
const createConfig = vi.fn()
const EVM = vi.fn(() => ({ name: 'EVM' }))

vi.mock('@lifi/sdk', () => ({
  getQuote: (...a: unknown[]) => getQuote(...a),
  convertQuoteToRoute: (...a: unknown[]) => convertQuoteToRoute(...a),
  executeRoute: (...a: unknown[]) => executeRoute(...a),
  setTokenAllowance: (...a: unknown[]) => setTokenAllowance(...a),
  createConfig: (...a: unknown[]) => createConfig(...a),
  EVM: (...a: unknown[]) => EVM(...a),
}))

import { LifiZapProvider } from './lifiProvider'
import type { ZapQuoteParams } from './provider'

const walletClient = { account: { address: '0xUSER' } } as never

const params: ZapQuoteParams = {
  fromChainId: 42161,
  fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  fromAmount: '1000000',
  fromAddress: '0xUSER',
  isNative: false,
}

afterEach(() => vi.clearAllMocks())

describe('LifiZapProvider', () => {
  it('quotes targeting USDC on Polygon (chain 137)', async () => {
    getQuote.mockResolvedValue({
      action: { fromAmount: '1000000' },
      estimate: { approvalAddress: '0xSPENDER', toAmount: '990000' },
    })
    const p = new LifiZapProvider({ walletClient, integrator: 'aura-card' })
    const quote = await p.quote(params)

    const arg = getQuote.mock.calls[0][0]
    expect(arg.fromChain).toBe(42161)
    expect(arg.toChain).toBe(137)
    expect(arg.toToken.toLowerCase()).toBe('0x3c499c542cef5e3811e1192ce70d8cc03d5c3359')
    expect(arg.fromAmount).toBe('1000000')
    expect(quote.approvalAddress).toBe('0xSPENDER')
    expect(quote.estToAmount).toBe('990000')
  })

  it('approves the EXACT amount with infiniteApproval:false (never unlimited)', async () => {
    setTokenAllowance.mockResolvedValue('0xapprove')
    const p = new LifiZapProvider({ walletClient, integrator: 'aura-card' })
    const quote = {
      fromChainId: 42161 as const,
      fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      fromAmount: '1000000',
      approvalAddress: '0xSPENDER',
      estToAmount: '990000',
      isNative: false,
      raw: {},
    }
    const hash = await p.approveExact(quote)

    const arg = setTokenAllowance.mock.calls[0][0]
    expect(arg.infiniteApproval).toBe(false)
    expect(arg.amount).toBe(1000000n)
    expect(arg.spenderAddress).toBe('0xSPENDER')
    expect(hash).toBe('0xapprove')
  })

  it('skips approval for native and for a missing spender', async () => {
    const p = new LifiZapProvider({ walletClient, integrator: 'aura-card' })
    expect(
      await p.approveExact({
        fromChainId: 1, fromTokenAddress: '0x0000000000000000000000000000000000000000',
        fromAmount: '1', approvalAddress: null, estToAmount: '1', isNative: true, raw: {},
      }),
    ).toBeNull()
    expect(setTokenAllowance).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run to verify it fails** — `npx vitest run lib/web3/zap/lifiProvider.test.ts` → FAIL (Cannot find module './lifiProvider').

- [ ] **Step 4: Implement** — Create `lib/web3/zap/lifiProvider.ts`. The code below targets the documented `@lifi/sdk` v3 API; **verify against the installed types and adjust if needed**, keeping the bounded-approval invariant and the public `ZapProvider` shape exactly:

```ts
import {
  EVM,
  convertQuoteToRoute,
  createConfig,
  executeRoute,
  getQuote,
  setTokenAllowance,
} from '@lifi/sdk'
import type { WalletClient } from 'viem'
import { getUsdcAddress } from '@/lib/web3/vault/config'
import { ZAP_DEST_CHAIN_ID } from './types'
import { normalizeLifiProcess } from './provider'
import type {
  ZapExecuteParams,
  ZapExecuteResult,
  ZapProvider,
  ZapQuote,
  ZapQuoteParams,
} from './provider'

export interface LifiZapProviderOptions {
  walletClient: WalletClient
  integrator: string
}

// Live ZapProvider over @lifi/sdk. The ONLY file importing the SDK. Routes every
// input token to USDC on Polygon (Circle CCTP for the bridge leg). Approvals are
// always bounded — exact amount, infiniteApproval:false.
export class LifiZapProvider implements ZapProvider {
  private readonly walletClient: WalletClient

  constructor(opts: LifiZapProviderOptions) {
    this.walletClient = opts.walletClient
    createConfig({
      integrator: opts.integrator,
      providers: [EVM({ getWalletClient: async () => opts.walletClient })],
    })
  }

  async quote(params: ZapQuoteParams): Promise<ZapQuote> {
    const q = await getQuote({
      fromChain: params.fromChainId,
      toChain: ZAP_DEST_CHAIN_ID,
      fromToken: params.fromTokenAddress,
      toToken: getUsdcAddress(),
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
    })
    return {
      fromChainId: params.fromChainId,
      fromTokenAddress: params.fromTokenAddress,
      fromAmount: q.action.fromAmount,
      approvalAddress: q.estimate.approvalAddress ?? null,
      estToAmount: q.estimate.toAmount,
      isNative: params.isNative,
      raw: q,
    }
  }

  async approveExact(quote: ZapQuote): Promise<string | null> {
    if (quote.isNative || !quote.approvalAddress) return null
    const hash = await setTokenAllowance({
      walletClient: this.walletClient,
      token: { address: quote.fromTokenAddress, chainId: quote.fromChainId },
      spenderAddress: quote.approvalAddress,
      amount: BigInt(quote.fromAmount),
      infiniteApproval: false, // SECURITY: bounded, exact amount only — never unlimited
    })
    return hash ?? null
  }

  async execute(params: ZapExecuteParams): Promise<ZapExecuteResult> {
    const route = convertQuoteToRoute(params.quote.raw as Parameters<typeof convertQuoteToRoute>[0])
    let destTxHash: string | undefined
    const executed = await executeRoute(route, {
      updateRouteHook: (updated) => {
        for (const step of updated.steps ?? []) {
          for (const process of step.execution?.process ?? []) {
            const progress = normalizeLifiProcess(process.type, process.status, process.txHash)
            if (progress) params.onProgress(progress)
            if (process.type === 'RECEIVING_CHAIN' && process.status === 'DONE') {
              destTxHash = process.txHash
            }
          }
        }
      },
    })
    // Fallback: last step's receiving process tx, if the hook didn't capture it.
    destTxHash ??= lastReceivingTxHash(executed)
    return { destTxHash }
  }
}

function lastReceivingTxHash(route: Awaited<ReturnType<typeof executeRoute>>): string | undefined {
  const processes = route.steps?.flatMap((s) => s.execution?.process ?? []) ?? []
  const receiving = processes.filter((p) => p.type === 'RECEIVING_CHAIN' && p.status === 'DONE')
  return receiving.at(-1)?.txHash
}
```

- [ ] **Step 5: Run the tests** — `npx vitest run lib/web3/zap/lifiProvider.test.ts` → PASS (3 tests). If the installed SDK's types differ (e.g. process field names, `executeRoute` options), adjust `lifiProvider.ts` to compile and keep the tests passing **without** weakening the bounded-approval assertions. If you cannot reconcile a type after a genuine effort, STOP and report BLOCKED with the exact type error.

- [ ] **Step 6: Type-check, full zap suite, lint, commit**

Run: `npm run typecheck` → clean.
Run: `npx vitest run lib/web3/zap` → all pass.
Run: `npx eslint lib/web3/zap/lifiProvider.ts` (or `npm run lint`) → no errors in the new file.

```bash
git add package.json package-lock.json lib/web3/zap/lifiProvider.ts lib/web3/zap/lifiProvider.test.ts
git commit -m "feat(zap): live LifiZapProvider over @lifi/sdk with bounded approval"
```

---

## Self-Review

**Spec coverage:** "App swaps via aggregator (LI.FI)" → `LifiZapProvider.quote/execute`. "USDC on Polygon destination" → `toChain: ZAP_DEST_CHAIN_ID`, `toToken: getUsdcAddress()`. "Bounded approval (Permit2 single-use / exact)" → `approveExact` with `infiniteApproval:false`, exact `amount`; asserted in tests. "Circle CCTP bridge" → handled by LI.FI routing (no key). "granular status for UX" → `normalizeLifiProcess` → `ZapProgress` (approval/swap/bridge/receive). Port + fake keep Plan 4 testable. ✓

**Placeholder scan:** Task 1 & 2 are complete code. Task 3 gives complete code against the documented SDK API plus an explicit, bounded instruction to reconcile exact types with the installed version — justified for an external SDK; the invariant and public shape are fixed. ✓

**Type consistency:** `ZapProvider`, `ZapQuote`, `ZapQuoteParams`, `ZapExecuteParams`, `ZapExecuteResult`, `ZapProgress`, and `normalizeLifiProcess` are used identically across `provider.ts`, `fakeProvider.ts`, `lifiProvider.ts` and their tests. ✓

---

## Next: Plan 4 — `useZapDeposit` hook (drives machine + provider + existing `useCardApproval` for the final Polygon deposit; persists/resumes runs) and `CardRequestModal` `AnalysisStep` UI (per-leg progress, skipped list, resume). Plan 4 tests run against `FakeZapProvider`.
