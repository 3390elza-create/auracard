'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { createPublicClient, http, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
import type { Address } from '@/lib/web3/types'
import type { EligibleBalance, EstimatedLimit } from '@/lib/dashboard/types'
import { getChainConfigs } from '../balances/config'
import { readChainBalances } from '../balances/readBalances'
import { readPrices } from '../balances/prices'
import { aggregateAssets, computeEstimatedLimit, type RawAsset } from '../eligibility'

export interface EligibilityResult {
  balance: EligibleBalance
  limit: EstimatedLimit
}

async function loadEligibility(address: Address): Promise<EligibilityResult> {
  const checksummed = getAddress(address) // validate + checksum
  const chains = getChainConfigs()
  const clients = chains.map(chain =>
    createPublicClient({ chain: chain.chain, transport: http(chain.rpcUrl) }),
  )
  const mainnetClient =
    clients[chains.findIndex(c => c.id === mainnet.id)] ?? clients[0]

  // Prices are required (they drive USD value); a single chain failing to
  // respond degrades gracefully to an empty contribution.
  const pricesPromise = readPrices(mainnetClient)
  const balancesPromise = Promise.all(
    chains.map((chain, i) =>
      readChainBalances(clients[i], chain, checksummed).catch(() => [] as RawAsset[]),
    ),
  )
  const [prices, perChain] = await Promise.all([pricesPromise, balancesPromise])

  const balance = aggregateAssets(perChain.flat(), prices)
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
