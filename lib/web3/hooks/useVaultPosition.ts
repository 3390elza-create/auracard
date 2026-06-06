'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Address } from '@/lib/web3/types'
import { readVaultPosition, type VaultPosition } from '@/lib/web3/vault/readVaultPosition'

export type { VaultPosition }

export function useVaultPosition(address: Address | undefined): UseQueryResult<VaultPosition> {
  return useQuery({
    queryKey: ['vaultPosition', address],
    queryFn: () => readVaultPosition(address as Address),
    enabled: Boolean(address),
    staleTime: 15_000,
    retry: 1,
  })
}
