'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { createPublicClient, http, parseSignature, getAddress } from 'viem'
import type { Address } from '@/lib/web3/types'
import {
  VAULT_CHAIN,
  VAULT_RPC_URL,
  USDC_PERMIT_VERSION,
  getVaultAddress,
  getUsdcAddress,
  vaultAbi,
  usdcAbi,
} from '@/lib/web3/vault/config'
import { buildPermitTypedData } from '@/lib/web3/vault/permit'

export type CardApprovalReason =
  | 'wrong_network'
  | 'insufficient_balance'
  | 'rejected_signature'
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
  readNonce: () => Promise<bigint>
  readTokenName: () => Promise<string>
  signTypedData: (typedData: ReturnType<typeof buildPermitTypedData>) => Promise<`0x${string}`>
  writeDeposit: (args: { assets: bigint; deadline: bigint; v: number; r: `0x${string}`; s: `0x${string}` }) => Promise<`0x${string}`>
  waitForReceipt: (hash: `0x${string}`) => Promise<{ status: 'success' | 'reverted' }>
  nowSeconds: () => bigint
}

export async function runCardApproval(deps: CardApprovalDeps): Promise<CardApprovalResult> {
  if (deps.chainId !== VAULT_CHAIN.id) return { status: 'error', reason: 'wrong_network' }

  const assets = deps.usdcBalance
  if (assets <= 0n) return { status: 'error', reason: 'insufficient_balance' }

  const deadline = deps.nowSeconds() + 3600n
  let signature: `0x${string}`
  try {
    const [name, nonce] = await Promise.all([deps.readTokenName(), deps.readNonce()])
    const typedData = buildPermitTypedData({
      tokenName: name,
      version: USDC_PERMIT_VERSION,
      chainId: deps.chainId,
      token: getUsdcAddress(),
      owner: deps.address,
      spender: getVaultAddress(),
      value: assets,
      nonce,
      deadline,
    })
    signature = await deps.signTypedData(typedData)
  } catch {
    return { status: 'error', reason: 'rejected_signature' }
  }

  const { r, s, v } = parseSignature(signature)
  let hash: `0x${string}`
  try {
    hash = await deps.writeDeposit({ assets, deadline, v: Number(v), r, s })
  } catch {
    return { status: 'error', reason: 'rejected_tx' }
  }

  try {
    const receipt = await deps.waitForReceipt(hash)
    if (receipt.status !== 'success') return { status: 'error', reason: 'tx_failed' }
  } catch {
    return { status: 'error', reason: 'network_error' }
  }
  return { status: 'active' }
}

export type CardApprovalState =
  | { status: 'ready' }
  | { status: 'signing' }
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

    setState({ status: 'signing' })
    const result = await runCardApproval({
      address: user,
      usdcBalance,
      chainId: VAULT_CHAIN.id,
      readTokenName: () =>
        publicClient.readContract({ address: usdc, abi: usdcAbi, functionName: 'name' }),
      readNonce: () =>
        publicClient.readContract({ address: usdc, abi: usdcAbi, functionName: 'nonces', args: [user] }),
      signTypedData: td =>
        walletClient.signTypedData({
          account: user,
          domain: td.domain,
          types: td.types,
          primaryType: td.primaryType,
          message: td.message,
        }),
      writeDeposit: async ({ assets, deadline, v, r, s }) => {
        setState({ status: 'depositing' })
        const hash = await walletClient.writeContract({
          address: vault,
          abi: vaultAbi,
          functionName: 'depositWithPermit',
          args: [assets, deadline, v, r, s],
        })
        setState({ status: 'confirming' })
        return hash
      },
      waitForReceipt: hash => publicClient.waitForTransactionReceipt({ hash }),
      nowSeconds: () => BigInt(Math.floor(Date.now() / 1000)),
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
