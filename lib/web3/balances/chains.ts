// Map Alchemy network ids (and the matic alias) to EVM numeric chain ids.
// These are the source chains the cross-chain zap can read and convert from.
export const ALCHEMY_NETWORK_TO_CHAIN_ID: Record<string, number> = {
  'eth-mainnet': 1,
  'opt-mainnet': 10,
  'polygon-mainnet': 137,
  'matic-mainnet': 137,
  'base-mainnet': 8453,
  'arb-mainnet': 42161,
}

/** Numeric EVM chain id for an Alchemy network id; null when unknown/missing. */
export function chainIdForNetwork(network: string | undefined): number | null {
  if (!network) return null
  return ALCHEMY_NETWORK_TO_CHAIN_ID[network] ?? null
}
