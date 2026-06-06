// Canonical, whitelisted collateral assets. On-chain a single asset may appear
// on several networks (and as native or wrapped) — we aggregate them by symbol.
export type CanonicalSymbol = 'ETH' | 'BTC' | 'USDC'
export type PriceKey = 'ETH' | 'BTC' | 'USD'

export interface CanonicalMeta {
  name: string
  decimals: number
  priceKey: PriceKey
}

export const CANONICAL_META: Record<CanonicalSymbol, CanonicalMeta> = {
  ETH: { name: 'Ethereum', decimals: 18, priceKey: 'ETH' },
  BTC: { name: 'Bitcoin', decimals: 8, priceKey: 'BTC' },
  USDC: { name: 'USDC', decimals: 6, priceKey: 'USD' },
}
