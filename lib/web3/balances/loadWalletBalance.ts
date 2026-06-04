import { createPublicClient, http, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
import type { Address } from '@/lib/web3/types'
import type { EligibleBalance } from '@/lib/dashboard/types'
import { getChainConfigs } from './config'
import { readChainBalances } from './readBalances'
import { readPrices } from './prices'
import { aggregateAssets, type RawAsset } from '../eligibility'

/**
 * Server-safe: read a wallet's whitelisted token balances across all configured
 * chains and value them in USD. READ-ONLY — never sends a transaction.
 */
export async function loadWalletBalance(address: Address): Promise<EligibleBalance> {
  const checksummed = getAddress(address) // validate + checksum
  const chains = getChainConfigs()
  const clients = chains.map(chain =>
    createPublicClient({ chain: chain.chain, transport: http(chain.rpcUrl) }),
  )
  const mainnetClient = clients[chains.findIndex(c => c.id === mainnet.id)] ?? clients[0]

  const pricesPromise = readPrices(mainnetClient)
  const balancesPromise = Promise.all(
    chains.map((chain, i) =>
      readChainBalances(clients[i], chain, checksummed).catch(() => [] as RawAsset[]),
    ),
  )
  const [prices, perChain] = await Promise.all([pricesPromise, balancesPromise])
  return aggregateAssets(perChain.flat(), prices)
}
