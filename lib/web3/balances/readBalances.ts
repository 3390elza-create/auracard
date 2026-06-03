import type { PublicClient } from 'viem'
import type { Address } from '@/lib/web3/types'
import type { RawAsset } from '../eligibility'
import type { ChainConfig } from './config'
import { erc20BalanceOfAbi } from './abi'

/**
 * Read a wallet's whitelisted token balances on a single chain.
 * READ-ONLY: native balance via `getBalance`, ERC-20s via a `balanceOf`
 * multicall. Never sends a transaction. Zero balances are dropped.
 */
export async function readChainBalances(
  client: PublicClient,
  chain: ChainConfig,
  address: Address,
): Promise<RawAsset[]> {
  const nativeToken = chain.tokens.find(t => t.kind === 'native')
  const erc20Tokens = chain.tokens.filter(t => t.kind === 'erc20')

  const nativeRaw = nativeToken ? await client.getBalance({ address }) : 0n
  const erc20Results = erc20Tokens.length
    ? await client.multicall({
        allowFailure: true,
        contracts: erc20Tokens.map(token => ({
          address: token.address as Address,
          abi: erc20BalanceOfAbi,
          functionName: 'balanceOf',
          args: [address],
        })),
      })
    : []

  const raws: RawAsset[] = []
  if (nativeToken && nativeRaw > 0n) {
    raws.push({ canonical: nativeToken.canonical, raw: nativeRaw })
  }
  erc20Tokens.forEach((token, i) => {
    const result = erc20Results[i]
    if (result?.status === 'success' && typeof result.result === 'bigint' && result.result > 0n) {
      raws.push({ canonical: token.canonical, raw: result.result })
    }
  })
  return raws
}
