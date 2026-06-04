import { mainnet, base, arbitrum, polygon, baseSepolia } from 'wagmi/chains'

export const SUPPORTED_CHAINS = [mainnet, base, arbitrum, polygon, baseSepolia] as const
export const DEFAULT_CHAIN_ID: number = mainnet.id // 1
export const VAULT_CHAIN_ID: number = polygon.id // 137 (Polygon mainnet)

const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [base.id]: 'Base',
  [arbitrum.id]: 'Arbitrum',
  [polygon.id]: 'Polygon',
  [baseSepolia.id]: 'Base Sepolia',
}

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? 'Unknown'
}
