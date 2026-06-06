// Shared config for Alchemy Portfolio Data API reads. Used by both the
// user-facing eligibility route and the admin per-wallet valuation, so a single
// wallet read behaves identically wherever it is requested.

// Networks scanned for a wallet's full priced balance. One Alchemy key serves
// all of them via the Data API. Override with ELIGIBILITY_NETWORKS
// (comma-separated). All ids below have native-token metadata in NATIVE_META so
// native balances are valued, not just ERC-20s.
const DEFAULT_NETWORKS = [
  'eth-mainnet',
  'polygon-mainnet',
  'base-mainnet',
  'arb-mainnet',
  'opt-mainnet',
]

export function portfolioNetworks(): string[] {
  const raw = process.env.ELIGIBILITY_NETWORKS
  if (!raw) return DEFAULT_NETWORKS
  return raw.split(',').map((n) => n.trim()).filter(Boolean)
}

// Prefer a dedicated server key; otherwise reuse the key already embedded in a
// configured Alchemy RPC URL (it is the same Alchemy account). Returns null when
// no Alchemy key can be resolved.
export function resolveAlchemyKey(): string | null {
  const explicit = process.env.ALCHEMY_API_KEY
  if (explicit) return explicit
  for (const url of [process.env.NEXT_PUBLIC_RPC_URL_POLYGON, process.env.NEXT_PUBLIC_RPC_URL]) {
    const match = url?.match(/\/v2\/([^/?#]+)/)
    if (match) return match[1]
  }
  return null
}
