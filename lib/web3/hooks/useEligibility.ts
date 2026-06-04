'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Address } from '@/lib/web3/types'
import type { EligibleBalance, EstimatedLimit } from '@/lib/dashboard/types'
import { loadWalletBalance } from '../balances/loadWalletBalance'
import { computeEstimatedLimit } from '../eligibility'

export interface EligibilityResult {
  balance: EligibleBalance
  limit: EstimatedLimit
}

async function loadEligibility(address: Address): Promise<EligibilityResult> {
  const balance = await loadWalletBalance(address)
  return { balance, limit: computeEstimatedLimit(balance.totalUsd) }
}

export function useEligibility(address: Address | undefined): UseQueryResult<EligibilityResult> {
  return useQuery({
    queryKey: ['eligibility', address],
    queryFn: () => loadEligibility(address as Address),
    enabled: Boolean(address),
    staleTime: 60_000,
    retry: 1,
  })
}
