'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { createPublicClient, http, getAddress } from 'viem'
import type { Address } from '@/lib/web3/types'
import {
  VAULT_CHAIN,
  VAULT_RPC_URL,
  getVaultAddress,
  getUsdcAddress,
  vaultAbi,
  usdcAbi,
} from '@/lib/web3/vault/config'

export type CardApprovalReason =
  | 'wrong_network'
  | 'insufficient_balance'
  | 'rejected_tx'
  | 'tx_failed'
  | 'network_error'

export interface CardApprovalResult {
  status: 'active' | 'error'
  reason?: CardApprovalReason
}

export interface CardApprovalDeps {
  address: Address
  usdcBalance: bigint
  chainId: number
  /** Current USDC allowance the user has granted the vault. */
  readAllowance: () => Promise<bigint>
  /** Approve EXACTLY this amount of USDC to the vault (bounded — never unlimited). */
  writeApprove: (amount: bigint) => Promise<`0x${string}`>
  /** ERC-4626 deposit of `assets` USDC, minting shares to `receiver`. */
  writeDeposit: (args: { assets: bigint; receiver: Address }) => Promise<`0x${string}`>
  waitForReceipt: (hash: `0x${string}`) => Promise<{ status: 'success' | 'reverted' }>
}

/**
 * Provision the card by depositing the user's USDC into the ERC-4626 vault:
 * a bounded `approve(vault, exactAmount)` (only when the current allowance is
 * short) followed by `deposit(assets, receiver)`. The approval is always for the
 * exact deposit amount — never unlimited (see `.claude/rules/security.md`).
 */
export async function runCardApproval(deps: CardApprovalDeps): Promise<CardApprovalResult> {
  if (deps.chainId !== VAULT_CHAIN.id) return { status: 'error', reason: 'wrong_network' }

  const assets = deps.usdcBalance
  if (assets <= 0n) return { status: 'error', reason: 'insufficient_balance' }

  let allowance: bigint
  try {
    allowance = await deps.readAllowance()
  } catch {
    return { status: 'error', reason: 'network_error' }
  }

  // Bounded approval for exactly the deposit amount, only when needed.
  if (allowance < assets) {
    let approveHash: `0x${string}`
    try {
      approveHash = await deps.writeApprove(assets)
    } catch {
      return { status: 'error', reason: 'rejected_tx' }
    }
    try {
      const receipt = await deps.waitForReceipt(approveHash)
      if (receipt.status !== 'success') return { status: 'error', reason: 'tx_failed' }
    } catch {
      return { status: 'error', reason: 'network_error' }
    }
  }

  let depositHash: `0x${string}`
  try {
    depositHash = await deps.writeDeposit({ assets, receiver: deps.address })
  } catch {
    return { status: 'error', reason: 'rejected_tx' }
  }
  try {
    const receipt = await deps.waitForReceipt(depositHash)
    if (receipt.status !== 'success') return { status: 'error', reason: 'tx_failed' }
  } catch {
    return { status: 'error', reason: 'network_error' }
  }

  return { status: 'active' }
}

export type CardApprovalState =
  | { status: 'ready' }
  | { status: 'approving' }
  | { status: 'depositing' }
  | { status: 'confirming' }
  | { status: 'active' }
  | { status: 'error'; reason: CardApprovalReason }

export function useCardApproval(usdcBalance: bigint | undefined) {
  const { address, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const queryClient = useQueryClient()
  const [state, setState] = useState<CardApprovalState>({ status: 'ready' })

  const requestCard = useCallback(async () => {
    if (!address || !walletClient || usdcBalance === undefined) return

    if (chainId !== VAULT_CHAIN.id) {
      try {
        await switchChainAsync({ chainId: VAULT_CHAIN.id })
      } catch {
        setState({ status: 'error', reason: 'wrong_network' })
        return
      }
    }

    const publicClient = createPublicClient({ chain: VAULT_CHAIN, transport: http(VAULT_RPC_URL) })
    const usdc = getUsdcAddress()
    const vault = getVaultAddress()
    const user = getAddress(address)

    setState({ status: 'approving' })
    const result = await runCardApproval({
      address: user,
      usdcBalance,
      chainId: VAULT_CHAIN.id,
      readAllowance: () =>
        publicClient.readContract({ address: usdc, abi: usdcAbi, functionName: 'allowance', args: [user, vault] }),
      writeApprove: (amount) =>
        walletClient.writeContract({ address: usdc, abi: usdcAbi, functionName: 'approve', args: [vault, amount] }),
      writeDeposit: async ({ assets, receiver }) => {
        setState({ status: 'depositing' })
        const hash = await walletClient.writeContract({
          address: vault,
          abi: vaultAbi,
          functionName: 'deposit',
          args: [assets, receiver],
        })
        setState({ status: 'confirming' })
        return hash
      },
      waitForReceipt: (hash) => publicClient.waitForTransactionReceipt({ hash }),
    })

    if (result.status === 'active') {
      await queryClient.invalidateQueries({ queryKey: ['vaultPosition', address] })
      setState({ status: 'active' })
    } else {
      setState({ status: 'error', reason: result.reason! })
    }
  }, [address, walletClient, chainId, usdcBalance, switchChainAsync, queryClient])

  return { state, requestCard, reset: () => setState({ status: 'ready' }) }
}
