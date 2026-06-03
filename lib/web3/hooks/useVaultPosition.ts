'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { createPublicClient, http, getAddress } from 'viem'
import type { Address } from '@/lib/web3/types'
import {
  VAULT_CHAIN,
  VAULT_RPC_URL,
  getVaultAddress,
  getTestUsdcAddress,
  vaultAbi,
  testUsdcAbi,
} from '@/lib/web3/vault/config'

export interface VaultPosition {
  usdcBalance: bigint
  shares: bigint
  depositedAssets: bigint
  isActive: boolean
}

export async function readVaultPosition(address: Address): Promise<VaultPosition> {
  const user = getAddress(address)
  const client = createPublicClient({ chain: VAULT_CHAIN, transport: http(VAULT_RPC_URL) })
  const vault = getVaultAddress()
  const usdc = getTestUsdcAddress()

  const [usdcBalance, shares] = await Promise.all([
    client.readContract({ address: usdc, abi: testUsdcAbi, functionName: 'balanceOf', args: [user] }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: 'balanceOf', args: [user] }),
  ])
  const depositedAssets =
    shares > 0n
      ? await client.readContract({ address: vault, abi: vaultAbi, functionName: 'convertToAssets', args: [shares] })
      : 0n

  return { usdcBalance, shares, depositedAssets, isActive: shares > 0n }
}

export function useVaultPosition(address: Address | undefined): UseQueryResult<VaultPosition> {
  return useQuery({
    queryKey: ['vaultPosition', address],
    queryFn: () => readVaultPosition(address as Address),
    enabled: Boolean(address),
    staleTime: 15_000,
    retry: 1,
  })
}
