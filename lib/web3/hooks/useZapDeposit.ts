'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSwitchChain } from 'wagmi'
import { getWalletClient } from '@wagmi/core'
import { createPublicClient, http, getAddress, type WalletClient } from 'viem'
import type { Address } from '@/lib/web3/types'
import type { AssetBalance } from '@/lib/dashboard/types'
import { wagmiConfig } from '../wagmi'
import {
  VAULT_CHAIN,
  VAULT_RPC_URL,
  getUsdcAddress,
  getVaultAddress,
  usdcAbi,
  vaultAbi,
} from '../vault/config'
import { runCardApproval } from './useCardApproval'
import { buildZapPlan } from '../zap/plan'
import { applyLegEvent, createRun, type LegEvent, type ZapRunState } from '../zap/machine'
import { clearRun, loadRun, saveRun } from '../zap/persistence'
import { LifiZapProvider } from '../zap/lifiProvider'
import { runZap } from '../zap/orchestrate'
import type { ZapChainId } from '../zap/types'

const LIFI_INTEGRATOR = process.env.NEXT_PUBLIC_LIFI_INTEGRATOR || 'aura-card'

export type ZapPhase = 'idle' | 'running' | 'done' | 'error'

export interface UseZapDeposit {
  /** The plan derived from the wallet's assets (legs to convert + skipped tokens). */
  plan: ReturnType<typeof buildZapPlan>
  /** Live run state (per-leg progress); restored from storage on mount. */
  run: ZapRunState | null
  phase: ZapPhase
  error: string | null
  isRunning: boolean
  /** Build the plan and run the whole swap+bridge→deposit flow. */
  start: () => Promise<void>
  /** Re-attempt after a failure (full re-run; see TODO on partial resume). */
  retry: () => Promise<void>
}

/**
 * Orchestrates the cross-chain zap for the connected wallet: builds a plan from
 * the eligibility assets, runs each leg through LI.FI (bounded approvals), and
 * finishes with the existing Polygon deposit. Persists/restores the run.
 *
 * The pure coordination logic (runZap) is unit-tested via FakeZapProvider; this
 * hook is the live wiring and can only be fully verified against a real wallet.
 */
export function useZapDeposit(address: Address | undefined, assets: AssetBalance[]): UseZapDeposit {
  const { switchChainAsync } = useSwitchChain()
  const [run, setRun] = useState<ZapRunState | null>(null)
  const [phase, setPhase] = useState<ZapPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const runningRef = useRef(false)

  const plan = useMemo(() => buildZapPlan(assets), [assets])

  // Restore an in-flight run on mount / address change (resume after refresh).
  useEffect(() => {
    setRun(address ? loadRun(address) : null)
  }, [address])

  const dispatch = useCallback((chainId: number, event: LegEvent) => {
    setRun((prev) => {
      if (!prev) return prev
      const next = applyLegEvent(prev, chainId as ZapChainId, event)
      saveRun(next)
      return next
    })
  }, [])

  // Switch the wallet to a chain and return its (chain-scoped) wallet client.
  const switchClient = useCallback(
    async (chainId: number): Promise<WalletClient> => {
      await switchChainAsync({ chainId })
      const client = await getWalletClient(wagmiConfig, { chainId })
      if (!client) throw new Error('wallet client unavailable after switch')
      return client as unknown as WalletClient
    },
    [switchChainAsync],
  )

  // Deposit the USDC that has ARRIVED on Polygon — read live, never a remembered
  // amount — through the bounded approve + ERC-4626 deposit flow.
  const deposit = useCallback(async () => {
    if (!address) return { status: 'error' as const, reason: 'no_address' }
    const walletClient = await switchClient(VAULT_CHAIN.id)
    const publicClient = createPublicClient({ chain: VAULT_CHAIN, transport: http(VAULT_RPC_URL) })
    const usdc = getUsdcAddress()
    const vault = getVaultAddress()
    const user = getAddress(address)

    const usdcBalance = (await publicClient.readContract({
      address: usdc,
      abi: usdcAbi,
      functionName: 'balanceOf',
      args: [user],
    })) as bigint

    const result = await runCardApproval({
      address: user,
      usdcBalance,
      chainId: VAULT_CHAIN.id,
      readAllowance: () =>
        publicClient.readContract({
          address: usdc,
          abi: usdcAbi,
          functionName: 'allowance',
          args: [user, vault],
        }) as Promise<bigint>,
      writeApprove: (amount) =>
        walletClient.writeContract({
          address: usdc,
          abi: usdcAbi,
          functionName: 'approve',
          args: [vault, amount],
          chain: VAULT_CHAIN,
          account: user,
        }),
      writeDeposit: ({ assets: depositAssets, receiver }) =>
        walletClient.writeContract({
          address: vault,
          abi: vaultAbi,
          functionName: 'deposit',
          args: [depositAssets, receiver],
          chain: VAULT_CHAIN,
          account: user,
        }),
      waitForReceipt: (hash) => publicClient.waitForTransactionReceipt({ hash }),
    })
    return { status: result.status, reason: result.reason }
  }, [address, switchClient])

  const start = useCallback(async () => {
    if (!address || runningRef.current || plan.legs.length === 0) return
    runningRef.current = true
    setPhase('running')
    setError(null)

    const fresh = createRun(
      address,
      plan.legs.map((l) => l.chainId),
    )
    setRun(fresh)
    saveRun(fresh)

    try {
      const walletClient = (await getWalletClient(wagmiConfig)) as unknown as WalletClient | null
      if (!walletClient) throw new Error('connect a wallet first')
      const provider = new LifiZapProvider({
        walletClient,
        integrator: LIFI_INTEGRATOR,
        switchChain: switchClient,
      })
      const result = await runZap(plan, { provider, fromAddress: address, dispatch, deposit })
      if (result.status === 'active') {
        setPhase('done')
        clearRun(address)
      } else {
        setPhase('error')
        setError(result.reason ?? 'zap_failed')
      }
    } catch (e) {
      setPhase('error')
      setError(e instanceof Error ? e.message : 'zap_failed')
    } finally {
      runningRef.current = false
    }
  }, [address, plan, dispatch, deposit, switchClient])

  // TODO(live): true partial resume should skip already-`done` legs in runZap.
  // For now retry re-runs the full plan (LI.FI re-quotes; the final deposit reads
  // the live USDC balance, so it never double-credits).
  const retry = start

  return { plan, run, phase, error, isRunning: phase === 'running', start, retry }
}
