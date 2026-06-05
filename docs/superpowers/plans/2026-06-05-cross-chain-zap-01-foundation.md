# Cross-Chain USDC Zap — Plan 1 of 4: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface per-token `chainId` / contract `address` / `isNative` through the balance layer, and build a pure, fully-tested **zap-plan builder** that decides which tokens to convert (floor + native gas reserve) and groups them per source chain.

**Architecture:** The live balance path (`fetchPortfolio` → `mapPortfolioTokens`) already receives token addresses and native flags from Alchemy but drops them. We add three optional fields to `AssetBalance`, populate them, and write a pure `buildZapPlan(assets, config)` that emits an ordered set of per-chain legs plus a list of skipped tokens with reasons. No external SDK, no contract, no UI — just data + pure logic, all unit-tested.

**Tech Stack:** TypeScript (strict), viem (`formatUnits`/`bigint`), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-05-cross-chain-usdc-zap-deposit-design.md`

**Decomposition (this is Plan 1 of 4):**
1. **Foundation (this plan):** balance enrichment + pure `buildZapPlan`.
2. State machine (`machine.ts`) + resumable persistence (`persistence.ts`) — pure.
3. LI.FI provider adapter (`lifi.ts`): quote, **bounded** approval, execute, status.
4. Orchestration hook (`useZapDeposit.ts`) + `CardRequestModal` UI wiring.

**Security note (applies to every plan):** approvals are always bounded; never `MaxUint256`/`setApprovalForAll`. This plan introduces no approvals or transactions — pure data only.

---

## File Structure

- Create: `lib/web3/balances/chains.ts` — Alchemy-network-id → numeric chainId map + helper.
- Create: `lib/web3/balances/chains.test.ts` — tests for the map/helper.
- Modify: `lib/dashboard/types.ts` — add `chainId?`, `address?`, `isNative?` to `AssetBalance`.
- Modify: `lib/web3/balances/portfolio.ts` — populate the three new fields.
- Create: `lib/web3/balances/portfolio.zap-fields.test.ts` — assert the fields are carried.
- Create: `lib/web3/zap/types.ts` — zap domain types + config + constants.
- Create: `lib/web3/zap/plan.ts` — pure `buildZapPlan`.
- Create: `lib/web3/zap/plan.test.ts` — full behaviour coverage for `buildZapPlan`.

The API route (`app/api/eligibility/route.ts`) and `useEligibility` already spread `...asset`, so the new fields propagate to the client with no change there (verified in Task 1 Step 6).

---

### Task 1: Enrich the balance layer with chainId / address / isNative

**Files:**
- Create: `lib/web3/balances/chains.ts`
- Test: `lib/web3/balances/chains.test.ts`
- Modify: `lib/dashboard/types.ts` (the `AssetBalance` interface, around lines 8-20)
- Modify: `lib/web3/balances/portfolio.ts` (the `mapPortfolioTokens` push, around lines 86-96)
- Test: `lib/web3/balances/portfolio.zap-fields.test.ts`

- [ ] **Step 1: Write the failing test for the chain map**

Create `lib/web3/balances/chains.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { chainIdForNetwork } from './chains'

describe('chainIdForNetwork', () => {
  it('maps the supported Alchemy network ids to EVM chain ids', () => {
    expect(chainIdForNetwork('eth-mainnet')).toBe(1)
    expect(chainIdForNetwork('opt-mainnet')).toBe(10)
    expect(chainIdForNetwork('polygon-mainnet')).toBe(137)
    expect(chainIdForNetwork('base-mainnet')).toBe(8453)
    expect(chainIdForNetwork('arb-mainnet')).toBe(42161)
  })

  it('treats Alchemy’s matic-mainnet alias as Polygon', () => {
    expect(chainIdForNetwork('matic-mainnet')).toBe(137)
  })

  it('returns null for unknown or missing networks', () => {
    expect(chainIdForNetwork('solana-mainnet')).toBeNull()
    expect(chainIdForNetwork(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/web3/balances/chains.test.ts`
Expected: FAIL — `Cannot find module './chains'`.

- [ ] **Step 3: Implement the chain map**

Create `lib/web3/balances/chains.ts`:

```ts
// Map Alchemy network ids (and the matic alias) to EVM numeric chain ids.
// These are the source chains the cross-chain zap can read and convert from.
export const ALCHEMY_NETWORK_TO_CHAIN_ID: Record<string, number> = {
  'eth-mainnet': 1,
  'opt-mainnet': 10,
  'polygon-mainnet': 137,
  'matic-mainnet': 137,
  'base-mainnet': 8453,
  'arb-mainnet': 42161,
}

/** Numeric EVM chain id for an Alchemy network id; null when unknown/missing. */
export function chainIdForNetwork(network: string | undefined): number | null {
  if (!network) return null
  return ALCHEMY_NETWORK_TO_CHAIN_ID[network] ?? null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/web3/balances/chains.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the three optional fields to `AssetBalance`**

In `lib/dashboard/types.ts`, replace the `AssetBalance` interface body (lines 8-20) with:

```ts
export interface AssetBalance {
  symbol: AssetSymbol
  name: string
  amountRaw: bigint
  decimals: number
  amountDisplay: string
  usdValue: number
  logo?: string | null
  // Alchemy network id the holding sits on (portfolio path only). The aggregated
  // RPC path leaves these undefined — hence optional.
  network?: string
  isUsdc?: boolean
  // Cross-chain zap fields (portfolio path only):
  // numeric EVM chain id derived from `network`; null when unmapped.
  chainId?: number | null
  // ERC-20 contract address; null for the chain's native token.
  address?: string | null
  // True when this holding is the chain's native gas token.
  isNative?: boolean
}
```

- [ ] **Step 6: Populate the fields in `mapPortfolioTokens` and write the failing test**

Create `lib/web3/balances/portfolio.zap-fields.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mapPortfolioTokens, type PortfolioToken } from './portfolio'

const priced = (overrides: Partial<PortfolioToken>): PortfolioToken => ({
  network: 'arb-mainnet',
  tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  tokenBalance: '0x' + (1_000_000n).toString(16), // 1 USDC (6 decimals)
  tokenMetadata: { decimals: 6, logo: null, name: 'USD Coin', symbol: 'USDC' },
  tokenPrices: [{ currency: 'usd', value: '1' }],
  ...overrides,
})

describe('mapPortfolioTokens — zap fields', () => {
  it('carries chainId and contract address for ERC-20 holdings', () => {
    const [asset] = mapPortfolioTokens([priced({})]).assets
    expect(asset.chainId).toBe(42161)
    expect(asset.address).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831')
    expect(asset.isNative).toBe(false)
  })

  it('flags native holdings with a null address and isNative=true', () => {
    const [asset] = mapPortfolioTokens([
      priced({
        network: 'eth-mainnet',
        tokenAddress: null,
        tokenBalance: '0x' + (10n ** 18n).toString(16), // 1 ETH
        tokenMetadata: { decimals: null, logo: null, name: null, symbol: null },
        tokenPrices: [{ currency: 'usd', value: '3000' }],
      }),
    ]).assets
    expect(asset.isNative).toBe(true)
    expect(asset.address).toBeNull()
    expect(asset.chainId).toBe(1)
  })

  it('leaves chainId null for an unmapped network', () => {
    const [asset] = mapPortfolioTokens([priced({ network: 'zksync-mainnet' })]).assets
    expect(asset.chainId).toBeNull()
  })
})
```

Run: `npx vitest run lib/web3/balances/portfolio.zap-fields.test.ts`
Expected: FAIL — `chainId`/`address`/`isNative` are `undefined`.

- [ ] **Step 7: Populate the fields**

In `lib/web3/balances/portfolio.ts`, add the import at the top (after the existing `./usdc` import on line 4):

```ts
import { chainIdForNetwork } from './chains'
```

Then in `mapPortfolioTokens`, change the `assets.push({ ... })` block (lines 86-96) to include the three fields:

```ts
    assets.push({
      symbol,
      name,
      amountRaw: raw,
      decimals,
      amountDisplay: formatTokenAmount(amount),
      usdValue,
      logo: token.tokenMetadata.logo,
      network: token.network,
      isUsdc: isUsdcToken(token.network, token.tokenAddress),
      chainId: chainIdForNetwork(token.network),
      address: token.tokenAddress,
      isNative,
    })
```

- [ ] **Step 8: Run the new test plus the whole balances suite**

Run: `npx vitest run lib/web3/balances`
Expected: PASS, including the new `portfolio.zap-fields.test.ts`. If a pre-existing portfolio test asserts an exact object shape and now fails only because the new optional fields are present, update that expectation to include them (the fields are additive and correct).

- [ ] **Step 9: Verify the fields reach the client unchanged**

Run: `npm run typecheck`
Expected: clean. (`app/api/eligibility/route.ts` spreads `...a`, and `useEligibility` spreads `...a` while converting `amountRaw` — so `chainId`/`address`/`isNative` propagate with no edit. The type-check confirms no consumer breaks.)

- [ ] **Step 10: Commit**

```bash
git add lib/web3/balances/chains.ts lib/web3/balances/chains.test.ts lib/dashboard/types.ts lib/web3/balances/portfolio.ts lib/web3/balances/portfolio.zap-fields.test.ts
git commit -m "feat(balances): carry chainId/address/isNative for cross-chain zap"
```

---

### Task 2: Zap domain types, config, and constants

**Files:**
- Create: `lib/web3/zap/types.ts`
- Test: covered indirectly by `plan.test.ts` (Task 3); no standalone test (types only).

- [ ] **Step 1: Create the types module**

Create `lib/web3/zap/types.ts`:

```ts
// Domain types for the cross-chain USDC zap. v1 EVM source chains only.
// All on-chain amounts are bigint; addresses are lowercase strings here and are
// checksummed at the edge where they hit viem (later plans).

// EVM source chains the zap supports in v1.
export const ZAP_SUPPORTED_CHAIN_IDS = [1, 10, 137, 8453, 42161] as const
export type ZapChainId = (typeof ZAP_SUPPORTED_CHAIN_IDS)[number]

// Destination of every leg: USDC on Polygon (the vault's collateral chain).
export const ZAP_DEST_CHAIN_ID: ZapChainId = 137

// Sentinel address LI.FI uses for a chain's native token.
export const NATIVE_SENTINEL = '0x0000000000000000000000000000000000000000'

export function isZapChainId(id: number | null | undefined): id is ZapChainId {
  return id != null && (ZAP_SUPPORTED_CHAIN_IDS as readonly number[]).includes(id)
}

export interface ZapToken {
  chainId: ZapChainId
  address: string // contract address, or NATIVE_SENTINEL for native
  symbol: string
  decimals: number
  amountRaw: bigint // full wallet balance of this token
  usdValue: number // USD value of the full balance
  isUsdc: boolean
  isNative: boolean
}

export interface ZapTokenSelection {
  token: ZapToken
  amountRaw: bigint // amount to convert (full balance, or native minus gas reserve)
  usdValue: number // USD value of amountRaw (for display + ordering)
}

export interface ZapLeg {
  chainId: ZapChainId
  selections: ZapTokenSelection[]
  totalUsd: number // sum of selection usdValue on this chain
}

export type SkipReason =
  | 'unsupported_chain'
  | 'missing_address'
  | 'below_floor'
  | 'native_below_reserve'

export interface SkippedToken {
  token: ZapToken
  reason: SkipReason
}

export interface ZapPlan {
  legs: ZapLeg[] // destination chain (Polygon) first, then others by total desc
  skipped: SkippedToken[]
  totalUsd: number // sum of all leg totals
}

export interface ZapPlanConfig {
  floorUsd: number // ignore tokens whose convertible value is below this
  nativeReserveUsd: number // keep this much native value per chain for gas
}

export const DEFAULT_ZAP_CONFIG: ZapPlanConfig = {
  floorUsd: 5,
  nativeReserveUsd: 3,
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/web3/zap/types.ts
git commit -m "feat(zap): domain types, config defaults, supported-chain constants"
```

---

### Task 3: Pure `buildZapPlan`

`buildZapPlan` takes the enriched eligibility assets and the config, and returns the per-chain legs + skipped tokens. Rules:
- Skip tokens on unsupported chains (`unsupported_chain`).
- Skip non-native tokens with no contract address (`missing_address`).
- **Native:** reserve `nativeReserveUsd` worth for gas; convert the rest. If the convertible remainder is below the floor, skip (`native_below_reserve`).
- **Non-native (incl. USDC):** convert the full balance; skip if below the floor (`below_floor`).
- Group selections by chain into legs; order legs with the **destination chain (Polygon) first**, then by descending total USD.
- Native reserve math uses integer micro-USD scaling — no floats on `bigint`.

**Files:**
- Create: `lib/web3/zap/plan.ts`
- Test: `lib/web3/zap/plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/web3/zap/plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AssetBalance } from '@/lib/dashboard/types'
import { buildZapPlan } from './plan'
import { DEFAULT_ZAP_CONFIG, NATIVE_SENTINEL } from './types'

// Minimal AssetBalance factory for plan inputs.
function asset(o: Partial<AssetBalance>): AssetBalance {
  return {
    symbol: 'TKN',
    name: 'Token',
    amountRaw: 0n,
    decimals: 18,
    amountDisplay: '0',
    usdValue: 0,
    chainId: 42161,
    address: '0xtoken',
    isNative: false,
    isUsdc: false,
    ...o,
  }
}

describe('buildZapPlan', () => {
  it('skips tokens on unsupported chains', () => {
    const plan = buildZapPlan([asset({ chainId: null, usdValue: 500 })], DEFAULT_ZAP_CONFIG)
    expect(plan.legs).toHaveLength(0)
    expect(plan.skipped).toEqual([
      expect.objectContaining({ reason: 'unsupported_chain' }),
    ])
  })

  it('skips non-native tokens missing a contract address', () => {
    const plan = buildZapPlan(
      [asset({ address: null, isNative: false, usdValue: 500 })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.skipped[0].reason).toBe('missing_address')
  })

  it('skips non-native tokens below the floor', () => {
    const plan = buildZapPlan([asset({ usdValue: 4, amountRaw: 4n })], DEFAULT_ZAP_CONFIG)
    expect(plan.skipped[0].reason).toBe('below_floor')
    expect(plan.legs).toHaveLength(0)
  })

  it('converts the full balance of a non-native token above the floor', () => {
    const plan = buildZapPlan(
      [asset({ chainId: 8453, address: '0xusdc', usdValue: 100, amountRaw: 100_000_000n })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].chainId).toBe(8453)
    expect(plan.legs[0].selections[0].amountRaw).toBe(100_000_000n)
    expect(plan.legs[0].selections[0].usdValue).toBe(100)
  })

  it('reserves native gas value and converts the remainder', () => {
    // 1 native unit (18 decimals) worth $30; reserve $3 => convert ~$27.
    const plan = buildZapPlan(
      [asset({ chainId: 1, isNative: true, address: null, decimals: 18, amountRaw: 10n ** 18n, usdValue: 30 })],
      DEFAULT_ZAP_CONFIG,
    )
    const sel = plan.legs[0].selections[0]
    expect(sel.token.address).toBe(NATIVE_SENTINEL)
    // reserveRaw = 1e18 * 3 / 30 = 1e17; convert = 9e17
    expect(sel.amountRaw).toBe(900_000_000_000_000_000n)
    expect(sel.usdValue).toBeCloseTo(27, 6)
  })

  it('skips native when the post-reserve remainder is below the floor', () => {
    // $7 native, reserve $3 => $4 remainder < $5 floor.
    const plan = buildZapPlan(
      [asset({ chainId: 1, isNative: true, address: null, amountRaw: 10n ** 18n, usdValue: 7 })],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.skipped[0].reason).toBe('native_below_reserve')
    expect(plan.legs).toHaveLength(0)
  })

  it('groups selections per chain and orders Polygon first, then by total desc', () => {
    const plan = buildZapPlan(
      [
        asset({ chainId: 1, address: '0xa', usdValue: 1000, amountRaw: 1000n }),
        asset({ chainId: 8453, address: '0xb', usdValue: 50, amountRaw: 50n }),
        asset({ chainId: 137, address: '0xc', usdValue: 10, amountRaw: 10n }),
      ],
      DEFAULT_ZAP_CONFIG,
    )
    expect(plan.legs.map((l) => l.chainId)).toEqual([137, 1, 8453])
    expect(plan.totalUsd).toBe(1060)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/web3/zap/plan.test.ts`
Expected: FAIL — `Cannot find module './plan'`.

- [ ] **Step 3: Implement `buildZapPlan`**

Create `lib/web3/zap/plan.ts`:

```ts
import type { AssetBalance } from '@/lib/dashboard/types'
import {
  DEFAULT_ZAP_CONFIG,
  NATIVE_SENTINEL,
  ZAP_DEST_CHAIN_ID,
  isZapChainId,
  type SkippedToken,
  type ZapChainId,
  type ZapLeg,
  type ZapPlan,
  type ZapPlanConfig,
  type ZapToken,
  type ZapTokenSelection,
} from './types'

const MICRO = 1_000_000 // integer micro-USD scale for float-free reserve math

function toZapToken(asset: AssetBalance, chainId: ZapChainId): ZapToken {
  return {
    chainId,
    address: asset.isNative ? NATIVE_SENTINEL : (asset.address as string),
    symbol: asset.symbol,
    decimals: asset.decimals,
    amountRaw: asset.amountRaw,
    usdValue: asset.usdValue,
    isUsdc: Boolean(asset.isUsdc),
    isNative: Boolean(asset.isNative),
  }
}

/** Raw amount to keep as native gas reserve, via integer micro-USD scaling. */
function nativeReserveRaw(amountRaw: bigint, usdValue: number, reserveUsd: number): bigint {
  const valueMicro = BigInt(Math.round(usdValue * MICRO))
  if (valueMicro <= 0n) return amountRaw // unpriced native: keep all, convert nothing
  const reserveMicro = BigInt(Math.round(reserveUsd * MICRO))
  const reserveRaw = (amountRaw * reserveMicro) / valueMicro
  return reserveRaw > amountRaw ? amountRaw : reserveRaw
}

/**
 * Pure: decide which holdings to convert to USDC and group them per source chain.
 * Native holdings keep a gas reserve; everything else converts in full. Tokens on
 * unsupported chains, without an address, or below the floor are skipped with a
 * reason. Legs are ordered with the destination chain (Polygon) first.
 */
export function buildZapPlan(
  assets: AssetBalance[],
  config: ZapPlanConfig = DEFAULT_ZAP_CONFIG,
): ZapPlan {
  const skipped: SkippedToken[] = []
  const byChain = new Map<ZapChainId, ZapTokenSelection[]>()

  for (const asset of assets) {
    if (!isZapChainId(asset.chainId ?? null)) {
      skipped.push({ token: asLooseToken(asset), reason: 'unsupported_chain' })
      continue
    }
    const chainId = asset.chainId as ZapChainId
    if (!asset.isNative && !asset.address) {
      skipped.push({ token: toZapToken(asset, chainId), reason: 'missing_address' })
      continue
    }

    const token = toZapToken(asset, chainId)

    let amountRaw: bigint
    let usdValue: number
    if (token.isNative) {
      const reserveRaw = nativeReserveRaw(token.amountRaw, token.usdValue, config.nativeReserveUsd)
      amountRaw = token.amountRaw - reserveRaw
      usdValue = token.usdValue - config.nativeReserveUsd
      if (amountRaw <= 0n || usdValue < config.floorUsd) {
        skipped.push({ token, reason: 'native_below_reserve' })
        continue
      }
    } else {
      amountRaw = token.amountRaw
      usdValue = token.usdValue
      if (usdValue < config.floorUsd) {
        skipped.push({ token, reason: 'below_floor' })
        continue
      }
    }

    const list = byChain.get(chainId) ?? []
    list.push({ token, amountRaw, usdValue })
    byChain.set(chainId, list)
  }

  const legs: ZapLeg[] = [...byChain.entries()].map(([chainId, selections]) => ({
    chainId,
    selections,
    totalUsd: selections.reduce((sum, s) => sum + s.usdValue, 0),
  }))

  legs.sort((a, b) => {
    if (a.chainId === ZAP_DEST_CHAIN_ID) return -1
    if (b.chainId === ZAP_DEST_CHAIN_ID) return 1
    return b.totalUsd - a.totalUsd
  })

  return { legs, skipped, totalUsd: legs.reduce((sum, l) => sum + l.totalUsd, 0) }
}

// For unsupported-chain skips we still want a token shape for display; chainId is
// not a ZapChainId, so build a best-effort token without the branded id.
function asLooseToken(asset: AssetBalance): ZapToken {
  return {
    chainId: (asset.chainId ?? 0) as ZapChainId,
    address: asset.isNative ? NATIVE_SENTINEL : (asset.address ?? ''),
    symbol: asset.symbol,
    decimals: asset.decimals,
    amountRaw: asset.amountRaw,
    usdValue: asset.usdValue,
    isUsdc: Boolean(asset.isUsdc),
    isNative: Boolean(asset.isNative),
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/web3/zap/plan.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Type-check and commit**

Run: `npm run typecheck`
Expected: clean.

```bash
git add lib/web3/zap/types.ts lib/web3/zap/plan.ts lib/web3/zap/plan.test.ts
git commit -m "feat(zap): pure buildZapPlan — floor, native gas reserve, per-chain legs"
```

---

## Self-Review

**Spec coverage (Plan 1 scope):**
- "Token selection & protections (automatic)" → Task 3 (`buildZapPlan`: floor, native reserve, USDC-no-special-case, per-chain grouping, skip reasons). ✓
- "From the eligibility asset list (already network-tagged, with `isUsdc`)" → Task 1 enriches with `chainId`/`address`/`isNative` so the planner can act. ✓
- Skipped tokens "surfaced to the user, never silently ignored" → `ZapPlan.skipped` with reasons. ✓
- Bigint-only amounts → `nativeReserveRaw` uses integer micro-USD scaling; no float math on `bigint`. ✓
- Out of scope here (later plans): LI.FI calls, approvals, state machine, persistence, UI — correctly absent.

**Placeholder scan:** none — every step has complete code and exact commands.

**Type consistency:** `buildZapPlan(assets, config)`, `ZapPlan { legs, skipped, totalUsd }`, `ZapLeg { chainId, selections, totalUsd }`, `ZapTokenSelection { token, amountRaw, usdValue }`, `ZapToken` fields, and `SkipReason` union are used identically across `types.ts`, `plan.ts`, and `plan.test.ts`. `chainIdForNetwork` returns `number | null`, matching `AssetBalance.chainId?: number | null`. ✓

---

## Next plans (write after Plan 1 lands)
- **Plan 2 — State machine + persistence:** pure `machine.ts` (per-leg states `idle→quoting→awaiting_approval→swapping→bridging→arriving→depositing→done`, error+resume) and `persistence.ts` (localStorage round-trip, SSR-safe). Pure + unit-tested.
- **Plan 3 — LI.FI adapter (`lifi.ts`):** `getQuote` per selection → USDC on Polygon; **bounded approval** via `setTokenAllowance({ infiniteApproval: false, amount: exact })` then `executeRoute` with `updateRouteHook` (pre-approving exact makes executeRoute skip its own infinite approval); status mapping; mocked-SDK tests asserting approval is never `MaxUint256`.
- **Plan 4 — Orchestration hook + UI:** `useZapDeposit.ts` driving the machine + adapter + existing `useCardApproval` for the final Polygon deposit; `CardRequestModal` `AnalysisStep` renders the plan, per-leg progress, skipped list, and resumes in-flight runs.
