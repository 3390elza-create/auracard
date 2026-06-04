import { formatUnits } from 'viem'
import type { AssetBalance, EligibleBalance } from '@/lib/dashboard/types'
import { formatTokenAmount } from '../eligibility'

// Raw token entry as returned by Alchemy's Portfolio API
// (POST /data/v1/{key}/assets/tokens/by-address).
export interface PortfolioToken {
  network: string
  tokenAddress: string | null // null => the chain's native token
  tokenBalance: string // hex-encoded raw amount
  tokenMetadata: {
    decimals: number | null
    logo: string | null
    name: string | null
    symbol: string | null
  }
  tokenPrices: { currency: string; value: string }[]
}

// Native tokens come back with null metadata, so we supply it per network.
// Alchemy returns Polygon's network id as "matic-mainnet".
interface NativeMeta {
  symbol: string
  name: string
  decimals: number
}
const NATIVE_META: Record<string, NativeMeta> = {
  'eth-mainnet': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  'matic-mainnet': { symbol: 'POL', name: 'Polygon', decimals: 18 },
  'polygon-mainnet': { symbol: 'POL', name: 'Polygon', decimals: 18 },
  'base-mainnet': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  'arb-mainnet': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  'opt-mainnet': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
}

// Below this we treat a holding as dust and drop it (keeps the list clean and
// stops priced-but-trivial balances from padding the total).
const MIN_USD_VALUE = 0.01

function usdPrice(token: PortfolioToken): number | null {
  const entry = token.tokenPrices.find((p) => p.currency === 'usd')
  if (!entry) return null
  const value = Number(entry.value)
  return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Filter + value a flat list of Portfolio API tokens into an EligibleBalance.
 * Pure: keeps only non-spam holdings (must have a USD price), drops zero
 * balances, unvaluable tokens (unknown decimals) and sub-cent dust, then values
 * each in USD, sorts descending, and sums the total.
 */
export function mapPortfolioTokens(tokens: PortfolioToken[]): EligibleBalance {
  const assets: AssetBalance[] = []

  for (const token of tokens) {
    const price = usdPrice(token)
    if (price === null) continue // no price => spam/illiquid, skip

    let raw: bigint
    try {
      raw = BigInt(token.tokenBalance)
    } catch {
      continue
    }
    if (raw <= 0n) continue

    const isNative = token.tokenAddress === null
    const nativeMeta = isNative ? NATIVE_META[token.network] : undefined

    const decimals = isNative ? nativeMeta?.decimals : token.tokenMetadata.decimals
    if (decimals === undefined || decimals === null) continue // cannot value safely

    const symbol = isNative
      ? (nativeMeta?.symbol ?? 'NATIVE')
      : (token.tokenMetadata.symbol ?? 'TOKEN')
    const name = isNative
      ? (nativeMeta?.name ?? symbol)
      : (token.tokenMetadata.name ?? symbol)

    const amount = Number(formatUnits(raw, decimals))
    const usdValue = amount * price
    if (!Number.isFinite(usdValue) || usdValue < MIN_USD_VALUE) continue

    assets.push({
      symbol,
      name,
      amountRaw: raw,
      decimals,
      amountDisplay: formatTokenAmount(amount),
      usdValue,
      logo: token.tokenMetadata.logo,
    })
  }

  assets.sort((a, b) => b.usdValue - a.usdValue)
  const totalUsd = assets.reduce((sum, a) => sum + a.usdValue, 0)
  return { totalUsd, assets }
}

interface PortfolioResponse {
  data?: { tokens?: PortfolioToken[]; pageKey?: string }
}

/**
 * Fetch every priced token a wallet holds across the given Alchemy networks,
 * following pagination. Server-side only: the API key must never reach the
 * browser. Network/transport failures degrade to whatever was collected.
 */
export async function fetchPortfolio(
  apiKey: string,
  address: string,
  networks: string[],
): Promise<EligibleBalance> {
  const url = `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`
  const collected: PortfolioToken[] = []
  let pageKey: string | undefined
  const MAX_PAGES = 5

  for (let page = 0; page < MAX_PAGES; page++) {
    const body: Record<string, unknown> = {
      addresses: [{ address, networks }],
      withMetadata: true,
      withPrices: true,
      includeNativeTokens: true,
      includeErc20Tokens: true,
    }
    if (pageKey) body.pageKey = pageKey

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) break
    const json = (await res.json()) as PortfolioResponse
    const tokens = json.data?.tokens ?? []
    collected.push(...tokens)
    pageKey = json.data?.pageKey
    if (!pageKey) break
  }

  return mapPortfolioTokens(collected)
}
