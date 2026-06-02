import { mainnet } from 'wagmi/chains'

export const SUPPORTED_CHAINS = [mainnet] as const
export const DEFAULT_CHAIN_ID: number = mainnet.id  // 1

export function getChainName(chainId: number): string {
  if (chainId === 1) return 'Ethereum'
  return 'Unknown'
}
