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
