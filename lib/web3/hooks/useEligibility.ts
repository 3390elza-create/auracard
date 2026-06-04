'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Address } from '@/lib/web3/types'
import type { AssetBalance, EligibleBalance, EstimatedLimit } from '@/lib/dashboard/types'
import { computeEstimatedLimit } from '../eligibility'

export interface EligibilityResult {
  balance: EligibleBalance
  limit: EstimatedLimit
}

interface ApiAsset extends Omit<AssetBalance, 'amountRaw'> {
  amountRaw: string
}
interface ApiResponse {
  totalUsd: number
  assets: ApiAsset[]
}

// Balances are read server-side (the Alchemy key stays off the client) at
// /api/eligibility, which scans every priced token the wallet holds.
async function loadEligibility(): Promise<EligibilityResult> {
  const res = await fetch('/api/eligibility', { credentials: 'include' })
  if (!res.ok) throw new Error(`eligibility request failed: ${res.status}`)
  const json = (await res.json()) as ApiResponse

  const assets: AssetBalance[] = json.assets.map((a) => ({
    ...a,
    amountRaw: BigInt(a.amountRaw),
  }))
  const balance: EligibleBalance = { totalUsd: json.totalUsd, assets }
  return { balance, limit: computeEstimatedLimit(balance.totalUsd) }
}

export function useEligibility(address: Address | undefined): UseQueryResult<EligibilityResult> {
  return useQuery({
    queryKey: ['eligibility', address],
    queryFn: loadEligibility,
    enabled: Boolean(address),
    staleTime: 60_000,
    retry: 1,
  })
}
