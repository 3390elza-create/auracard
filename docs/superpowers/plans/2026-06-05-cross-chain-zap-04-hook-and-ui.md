# Cross-Chain USDC Zap — Plan 4 of 4: Orchestration Hook + Modal UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire the engine (Plans 1-3) into the live flow: a dependency-injected orchestrator that runs a `ZapPlan` leg-by-leg through the provider, drives the state machine, persists/resumes, and finishes with the existing Polygon `depositWithPermit` — plus the `CardRequestModal` UI that triggers it and shows per-leg progress, skipped tokens, and resume.

**Architecture:** A **pure-ish, injected** `runZap(plan, deps)` orchestrator (no React, tested with `FakeZapProvider`) + a small pure `mapProgressToEvent` mapper. A thin `useZapDeposit` React hook adapts wagmi/viem + `LifiZapProvider` + the existing `useCardApproval` into the orchestrator's `deps` and exposes run state. The modal's analysis step gains a "Convert & deposit" action and a per-leg progress view. Approach A: legs deliver USDC to the user's own Polygon address, then ONE deposit credits the card.

**Tech Stack:** TypeScript (strict), React, wagmi/viem, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-05-cross-chain-usdc-zap-deposit-design.md`. **Depends on:** Plans 1-3 (`buildZapPlan`, machine, persistence, `ZapProvider`/`FakeZapProvider`/`LifiZapProvider`), existing `useCardApproval`/`runCardApproval`.

**Security:** the orchestrator issues no approvals itself — it calls `provider.approveExact` (bounded) and the existing `depositWithPermit`. No unbounded approvals, no operator fund movement.

---

## File Structure
- Create: `lib/web3/zap/orchestrate.ts` — pure `mapProgressToEvent` + injected `runZap`/`runZapLeg`.
- Create: `lib/web3/zap/orchestrate.test.ts` — happy path + failure + resume, all via `FakeZapProvider`.
- Create: `lib/web3/hooks/useZapDeposit.ts` — React adapter (provider + wagmi + persistence + deposit) exposing `{ run, start, retry }`.
- Modify: `components/dashboard/CardRequestModal.tsx` — `AnalysisStep` gains the zap action + progress; new `ZapProgressView` subcomponent.
- Create: `components/dashboard/ZapProgressView.tsx` — presentational per-leg progress + skipped list.
- Modify: `lib/web3/balances/config.ts` — add Optimism RPC entry (zap source chain currently lacks a transport).

---

### Task 1: Pure progress→event mapper + injected orchestrator

The orchestrator never touches React. `deps` are injected so tests use `FakeZapProvider` and stub the deposit. Per leg, for each selection: quote → bounded approve → execute (swap+bridge). `mapProgressToEvent` returns `null` for `approval` progress (approval is handled explicitly before execute) so execute only drives swap/bridge/receive forward. After all legs deliver USDC, the hook runs one deposit (the orchestrator calls `deps.deposit()` once at the end).

**Files:** Create `lib/web3/zap/orchestrate.ts` and `lib/web3/zap/orchestrate.test.ts`.

- [ ] **Step 1: Write the failing tests** — Create `lib/web3/zap/orchestrate.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { FakeZapProvider } from './fakeProvider'
import { mapProgressToEvent, runZap } from './orchestrate'
import type { ZapPlan } from './types'
import type { LegEvent } from './machine'

const plan: ZapPlan = {
  totalUsd: 100,
  skipped: [],
  legs: [
    {
      chainId: 42161,
      totalUsd: 100,
      selections: [
        {
          token: {
            chainId: 42161, address: '0xToken', symbol: 'USDC', decimals: 6,
            amountRaw: 100_000_000n, usdValue: 100, isUsdc: true, isNative: false,
          },
          amountRaw: 100_000_000n,
          usdValue: 100,
        },
      ],
    },
  ],
}

describe('mapProgressToEvent', () => {
  it('ignores approval progress (handled explicitly before execute)', () => {
    expect(mapProgressToEvent({ kind: 'approval', status: 'done' })).toBeNull()
  })
  it('advances swap/bridge/receive forward', () => {
    expect(mapProgressToEvent({ kind: 'swap', status: 'pending' })).toEqual({ type: 'ADVANCE', to: 'swapping' })
    expect(mapProgressToEvent({ kind: 'bridge', status: 'pending', txHash: '0xb' })).toEqual({
      type: 'ADVANCE', to: 'bridging', data: { bridgeTxHash: '0xb' },
    })
    expect(mapProgressToEvent({ kind: 'receive', status: 'done' })).toEqual({ type: 'ADVANCE', to: 'arriving' })
  })
  it('maps any failed progress to FAIL', () => {
    expect(mapProgressToEvent({ kind: 'bridge', status: 'failed' })).toEqual({ type: 'FAIL', reason: 'bridge_failed' })
  })
})

describe('runZap', () => {
  it('drives a leg through quote→approve→swap→bridge→arrive, then deposits once', async () => {
    const provider = new FakeZapProvider({
      approvalTxHash: '0xapprove',
      progress: [
        { kind: 'swap', status: 'done', txHash: '0xswap' },
        { kind: 'bridge', status: 'done', txHash: '0xbridge' },
        { kind: 'receive', status: 'done', txHash: '0xrecv' },
      ],
      destTxHash: '0xrecv',
    })
    const events: Array<[number, LegEvent]> = []
    const deposit = vi.fn(async () => ({ status: 'active' as const }))
    const result = await runZap(plan, {
      provider,
      fromAddress: '0xUSER',
      dispatch: (chainId, event) => events.push([chainId, event]),
      deposit,
    })

    const targets = events.filter((e) => e[1].type === 'ADVANCE').map((e) => (e[1] as { to: string }).to)
    expect(targets).toEqual(['quoting', 'awaiting_approval', 'swapping', 'bridging', 'arriving', 'depositing', 'done'])
    expect(deposit).toHaveBeenCalledOnce()
    expect(result.status).toBe('active')
  })

  it('emits FAIL and stops when a leg execute rejects', async () => {
    const provider = new FakeZapProvider({ failExecute: 'swap reverted' })
    const events: Array<[number, LegEvent]> = []
    const deposit = vi.fn(async () => ({ status: 'active' as const }))
    const result = await runZap(plan, {
      provider, fromAddress: '0xUSER',
      dispatch: (c, e) => events.push([c, e]), deposit,
    })
    expect(events.some(([, e]) => e.type === 'FAIL')).toBe(true)
    expect(deposit).not.toHaveBeenCalled()
    expect(result.status).toBe('error')
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run lib/web3/zap/orchestrate.test.ts` → FAIL.

- [ ] **Step 3: Implement** — Create `lib/web3/zap/orchestrate.ts`:

```ts
import type { ZapLeg, ZapPlan } from './types'
import type { ZapProgress, ZapProvider } from './provider'
import type { LegEvent, LegStatus } from './machine'

export interface DepositResult {
  status: 'active' | 'error'
  reason?: string
}

export interface ZapDeps {
  provider: ZapProvider
  fromAddress: string
  dispatch: (chainId: number, event: LegEvent) => void
  deposit: () => Promise<DepositResult>
}

const STATUS_BY_KIND: Record<Exclude<ZapProgress['kind'], 'approval'>, LegStatus> = {
  swap: 'swapping',
  bridge: 'bridging',
  receive: 'arriving',
}

const TXFIELD_BY_KIND: Record<Exclude<ZapProgress['kind'], 'approval'>, 'swapTxHash' | 'bridgeTxHash' | 'destTxHash'> = {
  swap: 'swapTxHash',
  bridge: 'bridgeTxHash',
  receive: 'destTxHash',
}

/**
 * Pure: translate normalized provider progress into a leg event. Approval
 * progress returns null (the orchestrator approves explicitly before execute).
 */
export function mapProgressToEvent(p: ZapProgress): LegEvent | null {
  if (p.status === 'failed') return { type: 'FAIL', reason: `${p.kind}_failed` }
  if (p.kind === 'approval') return null
  const to = STATUS_BY_KIND[p.kind]
  if (!p.txHash) return { type: 'ADVANCE', to }
  return { type: 'ADVANCE', to, data: { [TXFIELD_BY_KIND[p.kind]]: p.txHash } }
}

/** Run every selection of one leg: quote → bounded approve → execute (swap+bridge). */
export async function runZapLeg(leg: ZapLeg, deps: ZapDeps): Promise<void> {
  for (const sel of leg.selections) {
    deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'quoting' })
    const quote = await deps.provider.quote({
      fromChainId: leg.chainId,
      fromTokenAddress: sel.token.address,
      fromAmount: sel.amountRaw.toString(),
      fromAddress: deps.fromAddress,
      isNative: sel.token.isNative,
    })

    deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'awaiting_approval' })
    const approvalTxHash = await deps.provider.approveExact(quote)

    deps.dispatch(leg.chainId, {
      type: 'ADVANCE',
      to: 'swapping',
      data: approvalTxHash ? { approvalTxHash } : undefined,
    })
    await deps.provider.execute({
      quote,
      onProgress: (p) => {
        const event = mapProgressToEvent(p)
        if (event) deps.dispatch(leg.chainId, event)
      },
    })
  }
}

/**
 * Orchestrate a whole plan: each leg sequentially through swap+bridge, then a
 * single Polygon deposit of the arrived USDC. Stops and returns an error if any
 * leg fails (its FAIL event is already dispatched).
 */
export async function runZap(plan: ZapPlan, deps: ZapDeps): Promise<DepositResult> {
  for (const leg of plan.legs) {
    try {
      await runZapLeg(leg, deps)
    } catch (err) {
      deps.dispatch(leg.chainId, { type: 'FAIL', reason: err instanceof Error ? err.message : 'leg_failed' })
      return { status: 'error', reason: 'leg_failed' }
    }
  }
  // All legs delivered USDC to the user's Polygon address — one deposit credits the card.
  for (const leg of plan.legs) deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'depositing' })
  const result = await deps.deposit()
  if (result.status === 'active') {
    for (const leg of plan.legs) deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'done' })
  }
  return result
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run lib/web3/zap/orchestrate.test.ts` → PASS.

- [ ] **Step 5: Type-check & commit**

Run: `npm run typecheck` → clean.

```bash
git add lib/web3/zap/orchestrate.ts lib/web3/zap/orchestrate.test.ts
git commit -m "feat(zap): injected orchestrator + pure progress→event mapper"
```

---

### Task 2: `useZapDeposit` React hook

Adapts the orchestrator to the app: builds the plan from eligibility assets, constructs `LifiZapProvider` from the wagmi `walletClient`, applies machine events to React state (persisting each transition via Plan 2), resumes a saved run on mount, and supplies `deposit` by reusing the existing `useCardApproval`/`runCardApproval` against the **arrived** Polygon USDC balance.

**Files:** Create `lib/web3/hooks/useZapDeposit.ts`. **Test:** the orchestration logic is already covered by Task 1 against `FakeZapProvider`; the hook is a thin adapter (no new pure logic). If extracting any non-trivial logic, add a focused test mirroring `useCardApproval.test.ts` style.

- [ ] **Step 1:** Implement `useZapDeposit(address, assets)`:
  - `const [run, setRun] = useState<ZapRunState | null>(() => readSelectedRunOnClient())` — but localStorage is client-only; restore in an effect (`useEffect(() => setRun(loadRun(address)), [address])`).
  - `dispatch(chainId, event)`: `setRun(prev => { const next = applyLegEvent(prev, chainId, event); saveRun(next); return next })`.
  - `start()`: `const plan = buildZapPlan(assets); setRun(createRun(address, plan.legs.map(l => l.chainId)))`; build provider `new LifiZapProvider({ walletClient, integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR ?? 'aura-card' })`; call `runZap(plan, { provider, fromAddress: address, dispatch, deposit })`.
  - `deposit()`: read the user's **current** Polygon USDC balance (viem `balanceOf`), then run the existing deposit (`runCardApproval` with that balance) — never a remembered amount; on success `clearRun(address)`.
  - On `runZap` resolve/reject, surface final status; expose `retry()` that re-applies `{ type: 'RETRY' }` to the errored leg and re-runs from `activeLeg`.
  - Return `{ run, start, retry, isRunning }`.

- [ ] **Step 2:** `npm run typecheck` → clean; `npm run lint` → clean.

- [ ] **Step 3: Commit**

```bash
git add lib/web3/hooks/useZapDeposit.ts
git commit -m "feat(zap): useZapDeposit hook wiring orchestrator + provider + deposit"
```

---

### Task 3: Optimism RPC transport

Optimism is a supported zap source chain but `getChainConfigs()` has no Optimism entry, so swaps there have no transport.

**Files:** Modify `lib/web3/balances/config.ts`.

- [ ] **Step 1:** Add an Optimism entry to `getChainConfigs()` (import `optimism` from `viem/chains`), mirroring the Base entry, reading `NEXT_PUBLIC_RPC_URL_OPTIMISM` (fallback `https://mainnet.optimism.io`), tokens `[nativeEth, erc20('USDC', '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 6)]` (native USDC on Optimism). Run the existing balances tests to confirm no regression: `npx vitest run lib/web3/balances`.

- [ ] **Step 2: Commit**

```bash
git add lib/web3/balances/config.ts
git commit -m "feat(balances): add Optimism RPC transport for zap source chain"
```

---

### Task 4: Modal UI — trigger + per-leg progress

Wire the zap into `CardRequestModal`'s `AnalysisStep`: a primary "Convert & deposit" action (replacing the current "Continue" when there is non-USDC value to convert), a `ZapProgressView` showing each leg's chain + status (with a friendly label per `LegStatus`, e.g. "Bridging from Arbitrum…"), the skipped-tokens list from the plan, and resume (if `loadRun` returns an in-flight run on open). Reuse `CreditRing`. Keep all existing copy/behavior for the USDC-already-on-Polygon path.

**Files:** Create `components/dashboard/ZapProgressView.tsx`; Modify `components/dashboard/CardRequestModal.tsx`.

- [ ] **Step 1:** Build `ZapProgressView` (presentational): props `{ run: ZapRunState; skipped: SkippedToken[] }`; render one row per leg with `NETWORK_LABEL[chainId]` + a status label + spinner/check/alert icon; render a "skipped (below $5 / gas reserve)" summary. Match the existing modal's panel/typography tokens (no raw hex). Follow `.claude/rules/frontend.md`.
- [ ] **Step 2:** In `AnalysisStep`, call `useZapDeposit(address, assets)`; when `summary.usdcUsd < summary.totalUsd` (there is convertible non-USDC), show "Convert & deposit" → `start()`; while `isRunning`, render `<ZapProgressView />`; on done, transition to the existing `SuccessView`. Keep the plain USDC-deposit path otherwise.
- [ ] **Step 3:** `npm run typecheck`, `npm run lint`, `npx vitest run` → all green. Manually sanity-check the modal renders (no wallet needed for the mocked/empty state).
- [ ] **Step 4: Commit**

```bash
git add components/dashboard/ZapProgressView.tsx components/dashboard/CardRequestModal.tsx
git commit -m "feat(zap): modal convert-and-deposit action + per-leg progress view"
```

---

## Self-Review

**Spec coverage:** "automatic per-leg swap+bridge→deposit" → `runZap`/`runZapLeg`. "resumable, restore on open" → hook `loadRun`/`saveRun` + `RETRY`. "deposit reads actual arrived USDC" → `deposit()` reads live balance. "per-leg progress / skipped surfaced" → `ZapProgressView`. "bounded approval, no operator" → `provider.approveExact` + existing deposit. Optimism transport gap closed (Task 3). ✓

**Placeholder scan:** Task 1 (the testable core) is complete code. Tasks 2 & 4 specify exact wiring/props/behavior against named, existing APIs; the React/UI glue is described step-by-step (inherently less unit-testable — the logic lives in the Task-1 orchestrator, which IS fully tested). ✓

**Type consistency:** `ZapDeps`, `DepositResult`, `runZap`, `runZapLeg`, `mapProgressToEvent` are consistent across `orchestrate.ts`, its test, and the hook. The hook reuses `buildZapPlan`, `createRun`/`applyLegEvent`/`activeLeg`, `loadRun`/`saveRun`/`clearRun`, `LifiZapProvider`, and `runCardApproval` from Plans 1-3 / existing code. ✓

**Note (honest):** the live end-to-end path (real swap+bridge+deposit) can only be verified with the config from the spec's "what to configure" list (LI.FI integrator, per-chain RPCs incl. Optimism, a funded wallet). Until then, correctness rests on the Task-1 orchestrator tests (FakeZapProvider) + the Plan-3 provider tests.
