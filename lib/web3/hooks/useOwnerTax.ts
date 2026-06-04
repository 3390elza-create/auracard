'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { createPublicClient, http } from 'viem'
import { VAULT_CHAIN, VAULT_RPC_URL, getVaultAddress, vaultAbi } from '@/lib/web3/vault/config'

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
