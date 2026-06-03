import { mainnet, base, arbitrum, polygon } from 'wagmi/chains'

export const SUPPORTED_CHAINS = [mainnet, base, arbitrum, polygon] as const
export const DEFAULT_CHAIN_ID: number = mainnet.id // 1

const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [base.id]: 'Base',
  [arbitrum.id]: 'Arbitrum',
  [polygon.id]: 'Polygon',
}

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? 'Unknown'
}
