import type { PublicClient } from 'viem'
import type { PriceMap } from '../eligibility'
import { CHAINLINK_FEEDS } from './config'
import { chainlinkAggregatorAbi } from './abi'

const CHAINLINK_DECIMALS = 1e8 // Chainlink USD feeds return 8 decimals

/**
 * Read ETH/USD and BTC/USD from Chainlink on Ethereum mainnet (read-only).
 * A token's USD price is chain-independent, so we read once. USDC is pegged $1.
 */
export async function readPrices(mainnetClient: PublicClient): Promise<PriceMap> {
  const [eth, btc] = await mainnetClient.multicall({
    allowFailure: false,
    contracts: [
      { address: CHAINLINK_FEEDS.ETH, abi: chainlinkAggregatorAbi, functionName: 'latestRoundData' },
      { address: CHAINLINK_FEEDS.BTC, abi: chainlinkAggregatorAbi, functionName: 'latestRoundData' },
    ],
  })

  // latestRoundData → [roundId, answer, startedAt, updatedAt, answeredInRound]
  return {
    ETH: Number(eth[1]) / CHAINLINK_DECIMALS,
    BTC: Number(btc[1]) / CHAINLINK_DECIMALS,
    USD: 1,
  }
}
