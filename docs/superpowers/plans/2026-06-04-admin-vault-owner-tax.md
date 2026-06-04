# Admin Vault Panel (Total + ownerTax) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a vault panel to the admin dashboard that displays the vault's total assets under management and a button to call the accounting-only `ownerTax(amount, day)` contract function, signed by the admin's own connected wallet.

**Architecture:** Extend the existing `lib/web3/vault/` module with two ABI entries (`totalAssets`, `ownerTax`). A read hook (`useVaultTotal`) mirrors `useVaultPosition`; a write flow (`runOwnerTax` pure function + `useOwnerTax` wagmi hook) mirrors `useCardApproval` (logic separated from wagmi so it is unit-testable). A client `VaultAdminPanel` renders inside the already-built, server-guarded `app/admin/page.tsx`. No funds move; no server-held key signs.

**Tech Stack:** Next.js App Router, TypeScript, wagmi + viem, Reown AppKit (wallet connect), @tanstack/react-query, Vitest, Tailwind.

---

## File Structure

**New files:**
- `lib/web3/hooks/useVaultTotal.ts` — read `totalAssets()` (client, react-query)
- `lib/web3/hooks/useVaultTotal.test.ts`
- `lib/web3/hooks/useOwnerTax.ts` — pure `runOwnerTax(deps)` + `useOwnerTax()` hook
- `lib/web3/hooks/useOwnerTax.test.ts`
- `components/admin/VaultAdminPanel.tsx` — the panel UI

**Modified files:**
- `lib/web3/vault/config.ts` — add `totalAssets` and `ownerTax` to `vaultAbi`
- `app/admin/page.tsx` — render `VaultAdminPanel` above the users table

---

## Task 1: Extend the vault ABI

**Files:**
- Modify: `lib/web3/vault/config.ts`

- [ ] **Step 1: Add `totalAssets` and `ownerTax` to `vaultAbi`**

In `lib/web3/vault/config.ts`, the `vaultAbi` array currently ends with the `depositWithPermit` entry. Add these two entries to the array (keep the existing entries unchanged):
```ts
  { type: 'function', name: 'totalAssets', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'ownerTax',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'day', type: 'uint256' },
    ],
    outputs: [],
  },
```
The resulting `vaultAbi` keeps `... as const`.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/web3/vault/config.ts
git commit -m "feat(vault): add totalAssets and ownerTax to vault ABI"
```

---

## Task 2: `useVaultTotal` read hook

**Files:**
- Create: `lib/web3/hooks/useVaultTotal.ts`
- Test: `lib/web3/hooks/useVaultTotal.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/web3/hooks/useVaultTotal.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return { ...actual, createPublicClient: vi.fn(), http: vi.fn(() => ({})) }
})
vi.mock('@/lib/web3/vault/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/web3/vault/config')>()
  return { ...actual, getVaultAddress: vi.fn(() => '0x000000000000000000000000000000000000dEaD') }
})

import { createPublicClient } from 'viem'
import { readVaultTotal } from './useVaultTotal'

beforeEach(() => {
  vi.mocked(createPublicClient).mockReset()
})

describe('readVaultTotal', () => {
  it('reads totalAssets from the vault and returns it as a bigint', async () => {
    const readContract = vi.fn().mockResolvedValue(5_000_000n)
    vi.mocked(createPublicClient).mockReturnValue({ readContract } as never)

    const result = await readVaultTotal()

    expect(result).toEqual({ totalAssets: 5_000_000n })
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'totalAssets' }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/web3/hooks/useVaultTotal.test.ts`
Expected: FAIL — cannot find module `./useVaultTotal`.

- [ ] **Step 3: Implement the hook**

Create `lib/web3/hooks/useVaultTotal.ts`:
```ts
'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { createPublicClient, http } from 'viem'
import { VAULT_CHAIN, VAULT_RPC_URL, getVaultAddress, vaultAbi } from '@/lib/web3/vault/config'

export interface VaultTotal {
  totalAssets: bigint
}

/** READ-ONLY: total assets under management in the vault (USDC, 6 decimals). */
export async function readVaultTotal(): Promise<VaultTotal> {
  const client = createPublicClient({ chain: VAULT_CHAIN, transport: http(VAULT_RPC_URL) })
  const totalAssets = await client.readContract({
    address: getVaultAddress(),
    abi: vaultAbi,
    functionName: 'totalAssets',
  })
  return { totalAssets }
}

export function useVaultTotal(): UseQueryResult<VaultTotal> {
  return useQuery({
    queryKey: ['vaultTotal'],
    queryFn: readVaultTotal,
    staleTime: 15_000,
    retry: 1,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/web3/hooks/useVaultTotal.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/web3/hooks/useVaultTotal.ts lib/web3/hooks/useVaultTotal.test.ts
git commit -m "feat(vault): useVaultTotal read hook for totalAssets"
```

---

## Task 3: `useOwnerTax` write flow

**Files:**
- Create: `lib/web3/hooks/useOwnerTax.ts`
- Test: `lib/web3/hooks/useOwnerTax.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/web3/hooks/useOwnerTax.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { runOwnerTax } from './useOwnerTax'

function makeDeps(overrides: Partial<Parameters<typeof runOwnerTax>[0]> = {}) {
  return {
    amount: 1_000_000n,
    day: 20_240n,
    chainId: 137,
    writeOwnerTax: vi.fn().mockResolvedValue('0xhash'),
    waitForReceipt: vi.fn().mockResolvedValue({ status: 'success' as const }),
    ...overrides,
  }
}

describe('runOwnerTax', () => {
  it('writes ownerTax with the exact amount and day, then confirms', async () => {
    const deps = makeDeps()
    const result = await runOwnerTax(deps)
    expect(deps.writeOwnerTax).toHaveBeenCalledWith({ amount: 1_000_000n, day: 20_240n })
    expect(result).toEqual({ status: 'success' })
  })

  it('aborts on wrong network without writing', async () => {
    const deps = makeDeps({ chainId: 1 })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'wrong_network' })
    expect(deps.writeOwnerTax).not.toHaveBeenCalled()
  })

  it('reports rejected_tx when the user declines the transaction', async () => {
    const deps = makeDeps({ writeOwnerTax: vi.fn().mockRejectedValue(new Error('User rejected')) })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'rejected_tx' })
  })

  it('reports tx_failed when the receipt is reverted', async () => {
    const deps = makeDeps({ waitForReceipt: vi.fn().mockResolvedValue({ status: 'reverted' }) })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'tx_failed' })
  })

  it('reports network_error when waiting for the receipt throws', async () => {
    const deps = makeDeps({ waitForReceipt: vi.fn().mockRejectedValue(new Error('rpc')) })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'network_error' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/web3/hooks/useOwnerTax.test.ts`
Expected: FAIL — cannot find module `./useOwnerTax`.

- [ ] **Step 3: Implement the pure flow + hook**

Create `lib/web3/hooks/useOwnerTax.ts`:
```ts
'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { VAULT_CHAIN, getVaultAddress, vaultAbi } from '@/lib/web3/vault/config'

export type OwnerTaxReason = 'wrong_network' | 'rejected_tx' | 'tx_failed' | 'network_error'

export interface OwnerTaxResult {
  status: 'success' | 'error'
  reason?: OwnerTaxReason
}

export interface OwnerTaxDeps {
  amount: bigint
  day: bigint
  chainId: number
  writeOwnerTax: (args: { amount: bigint; day: bigint }) => Promise<`0x${string}`>
  waitForReceipt: (hash: `0x${string}`) => Promise<{ status: 'success' | 'reverted' }>
}

export async function runOwnerTax(deps: OwnerTaxDeps): Promise<OwnerTaxResult> {
  if (deps.chainId !== VAULT_CHAIN.id) return { status: 'error', reason: 'wrong_network' }

  let hash: `0x${string}`
  try {
    hash = await deps.writeOwnerTax({ amount: deps.amount, day: deps.day })
  } catch {
    return { status: 'error', reason: 'rejected_tx' }
  }

  try {
    const receipt = await deps.waitForReceipt(hash)
    if (receipt.status !== 'success') return { status: 'error', reason: 'tx_failed' }
  } catch {
    return { status: 'error', reason: 'network_error' }
  }
  return { status: 'success' }
}

export type OwnerTaxState =
  | { status: 'ready' }
  | { status: 'submitting' }
  | { status: 'confirming' }
  | { status: 'success' }
  | { status: 'error'; reason: OwnerTaxReason }

export function useOwnerTax() {
  const { address, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const queryClient = useQueryClient()
  const [state, setState] = useState<OwnerTaxState>({ status: 'ready' })

  const recordOwnerTax = useCallback(
    async ({ amount, day }: { amount: bigint; day: bigint }) => {
      if (!address || !walletClient) return

      if (chainId !== VAULT_CHAIN.id) {
        try {
          await switchChainAsync({ chainId: VAULT_CHAIN.id })
        } catch {
          setState({ status: 'error', reason: 'wrong_network' })
          return
        }
      }

      const { createPublicClient, http } = await import('viem')
      const { VAULT_RPC_URL } = await import('@/lib/web3/vault/config')
      const publicClient = createPublicClient({ chain: VAULT_CHAIN, transport: http(VAULT_RPC_URL) })
      const vault = getVaultAddress()

      setState({ status: 'submitting' })
      const result = await runOwnerTax({
        amount,
        day,
        chainId: VAULT_CHAIN.id,
        writeOwnerTax: async ({ amount, day }) => {
          const hash = await walletClient.writeContract({
            address: vault,
            abi: vaultAbi,
            functionName: 'ownerTax',
            args: [amount, day],
          })
          setState({ status: 'confirming' })
          return hash
        },
        waitForReceipt: hash => publicClient.waitForTransactionReceipt({ hash }),
      })

      if (result.status === 'success') {
        await queryClient.invalidateQueries({ queryKey: ['vaultTotal'] })
        setState({ status: 'success' })
      } else {
        setState({ status: 'error', reason: result.reason! })
      }
    },
    [address, walletClient, chainId, switchChainAsync, queryClient],
  )

  return { state, recordOwnerTax, reset: () => setState({ status: 'ready' }) }
}
```

Note: the dynamic `import('viem')` / `import('@/lib/web3/vault/config')` mirrors keeping the public-client construction out of module top-level (consistent with how `useCardApproval` builds its client inside the action). If the reviewer prefers, top-level imports are equivalent — but the action-scoped import keeps the hook lean. Either is acceptable; do NOT block on it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/web3/hooks/useOwnerTax.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS (existing tests unaffected; no type errors).

- [ ] **Step 6: Commit**

```bash
git add lib/web3/hooks/useOwnerTax.ts lib/web3/hooks/useOwnerTax.test.ts
git commit -m "feat(vault): useOwnerTax write flow (records owner tax, no fund movement)"
```

---

## Task 4: Vault admin panel UI

**Files:**
- Create: `components/admin/VaultAdminPanel.tsx`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Implement the panel (client component)**

Create `components/admin/VaultAdminPanel.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount } from 'wagmi'
import { getAppKit } from '@/lib/web3/appkit'
import { useVaultTotal } from '@/lib/web3/hooks/useVaultTotal'
import { useOwnerTax } from '@/lib/web3/hooks/useOwnerTax'

const USDC_DECIMALS = 6

function formatUsdc(value: bigint): string {
  const n = Number(formatUnits(value, USDC_DECIMALS))
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function errorMessage(reason: string): string {
  switch (reason) {
    case 'wrong_network': return 'Wrong network — switch to Polygon and try again.'
    case 'rejected_tx': return 'Transaction rejected in your wallet.'
    case 'tx_failed': return 'Transaction reverted — the connected wallet may not be the contract owner.'
    case 'network_error': return 'Network error while confirming. Please retry.'
    default: return 'Something went wrong.'
  }
}

export function VaultAdminPanel() {
  const { isConnected } = useAccount()
  const total = useVaultTotal()
  const { state, recordOwnerTax, reset } = useOwnerTax()

  const [amount, setAmount] = useState('')
  const [day, setDay] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const busy = state.status === 'submitting' || state.status === 'confirming'

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInputError(null)
    reset()
    let amountRaw: bigint
    let dayRaw: bigint
    try {
      amountRaw = parseUnits(amount, USDC_DECIMALS)
    } catch {
      setInputError('Enter a valid USDC amount.')
      return
    }
    if (amountRaw <= 0n) { setInputError('Amount must be greater than zero.'); return }
    if (!/^\d+$/.test(day)) { setInputError('Day must be a whole number.'); return }
    dayRaw = BigInt(day)
    void recordOwnerTax({ amount: amountRaw, day: dayRaw })
  }

  return (
    <section className="mx-auto mb-8 w-full max-w-6xl rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Vault</h2>
          <p className="text-sm text-white/50">
            Total under management:{' '}
            <span className="text-white/90">
              {total.isLoading ? 'Loading…' : total.isError || !total.data ? 'Unavailable' : formatUsdc(total.data.totalAssets)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => total.refetch()}
          className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm text-white/70">
          Amount (USDC)
          <input
            value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal"
            className="mt-1 w-40 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
          />
        </label>
        <label className="flex flex-col text-sm text-white/70">
          Day
          <input
            value={day} onChange={e => setDay(e.target.value)} inputMode="numeric"
            className="mt-1 w-32 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
          />
        </label>

        {isConnected ? (
          <button
            type="submit" disabled={busy}
            className="rounded-lg bg-gradient-to-r from-[#7C5CFF] via-[#4F8CFF] to-[#2DD4BF] px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {state.status === 'submitting' ? 'Submitting…' : state.status === 'confirming' ? 'Confirming…' : 'Record owner tax'}
          </button>
        ) : (
          <button
            type="button" onClick={() => getAppKit().open()}
            className="rounded-lg border border-white/10 px-4 py-2 font-medium text-white/80 hover:bg-white/5"
          >
            Connect wallet
          </button>
        )}
      </form>

      {inputError && <p role="alert" className="mt-3 text-sm text-red-400">{inputError}</p>}
      {state.status === 'error' && <p role="alert" className="mt-3 text-sm text-red-400">{errorMessage(state.reason)}</p>}
      {state.status === 'success' && <p className="mt-3 text-sm text-emerald-400">Owner tax recorded.</p>}
    </section>
  )
}
```

- [ ] **Step 2: Confirm the AppKit hook import path**

The Connect button uses `useAppKit` from `@reown/appkit/react`. Verify this matches how the rest of the app opens the modal: run
`npx grep-or-search` is not needed — instead open `lib/web3/appkit.ts` and any existing "connect" component (e.g. `app/connect/`) and confirm the import path + open function. If the project exposes a different connect affordance (e.g. a shared `<ConnectButton />` component or a `useAppKit().open()` vs `open({ view: 'Connect' })`), use that exact pattern instead. Adjust the import/handler in `VaultAdminPanel.tsx` to match the established pattern, and report any change.

- [ ] **Step 3: Render the panel in the admin page**

In `app/admin/page.tsx`, add the import and render the panel above the users table. The file becomes:
```tsx
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { VaultAdminPanel } from '@/components/admin/VaultAdminPanel'

export default async function AdminPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return (
    <main className="min-h-screen bg-[#0A0A0F] py-8">
      <VaultAdminPanel />
      <AdminUsersTable adminEmail={session.email} />
    </main>
  )
}
```
(Note: removed the table's own outer padding reliance by adding `py-8` to main; the table already centers itself via `mx-auto max-w-6xl p-8`, and the panel uses the same centering, so they align.)

- [ ] **Step 4: Verify typecheck + lint + build**

Run: `npm run typecheck && npm run lint`
Expected: PASS (pre-existing marketing-v2 `<img>` warnings are unrelated; no NEW errors from these files).

Run: `npm run build`
Expected: build succeeds; `/admin` still renders as a dynamic route (`ƒ`).
Note: the build needs env vars present (the repo has `.env.local`). If `NEXT_PUBLIC_VAULT_ADDRESS` is unset, `getVaultAddress()` is only called at request time inside the read hook / action (not at module load), so the build itself does not require it. If the build fails for a missing-env reason unrelated to these files, report it rather than masking it.

- [ ] **Step 5: Commit**

```bash
git add components/admin/VaultAdminPanel.tsx app/admin/page.tsx
git commit -m "feat(admin): vault panel showing total and ownerTax action button"
```

---

## Task 5: Full verification

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: PASS — all tests including the new `useVaultTotal` (1) and `useOwnerTax` (5) tests.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS (only pre-existing marketing-v2 `<img>` warnings).

- [ ] **Step 3: Manual smoke (optional — needs a deployed vault on Polygon)**

1. Sign in to `/admin`. The Vault panel shows "Total under management" (or "Unavailable" if `NEXT_PUBLIC_VAULT_ADDRESS` is unset / the read fails).
2. Click "Connect wallet" → connect the owner wallet via AppKit.
3. Enter an Amount (USDC) and a Day, click "Record owner tax".
4. If the vault exposes `ownerTax` and the wallet is the owner, the tx confirms and "Owner tax recorded." appears. Otherwise the reverted-tx message appears. No funds move either way.

- [ ] **Step 4: Final commit (if anything remains uncommitted)**

```bash
git add -A
git commit -m "chore(admin): vault panel verification"
```

---

## Self-Review Notes

- **Spec coverage:** ABI additions (Task 1); read total + hook (Task 2); `ownerTax` write flow as pure `runOwnerTax` + `useOwnerTax` with the exact state machine and reasons (Task 3); panel UI with total display, refresh, amount/day form, Connect-when-disconnected, inline tx status, USDC `parseUnits(amount, 6)` and integer `day` (Task 4); wiring into the guarded admin page (Task 4); tests for read and all write branches (Tasks 2–3). All covered.
- **Security:** no fund movement (records only); the wallet — never a server key — signs; reads are view-only; no approvals introduced. Documented in the spec; nothing in this plan contradicts it.
- **Type consistency:** `OwnerTaxReason`/`OwnerTaxResult`/`OwnerTaxState`, `runOwnerTax(deps)` signature, `recordOwnerTax({ amount, day })`, `readVaultTotal()→{ totalAssets }`, query keys `['vaultTotal']`, and the `vaultAbi` function names (`totalAssets`, `ownerTax`) are used consistently across tasks.
- **Out of scope (per spec):** claiming/withdrawing accrued tax, vault Solidity/deploy, history listing, server-side total reads.
