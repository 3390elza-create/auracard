import { formatUnits } from 'viem'
import type {
  AssetBalance,
  EligibleBalance,
  EstimatedLimit,
  EligibilitySummary,
  NetworkBreakdown,
} from '@/lib/dashboard/types'
import { CANONICAL_META, type CanonicalSymbol, type PriceKey } from './balances/config'

export interface RawAsset {
  canonical: CanonicalSymbol
  raw: bigint
}

export type PriceMap = Record<PriceKey, number>

// Loan-to-value used for the estimated card limit (business decision: flat 80%).
export const ELIGIBILITY_LTV = 0.8

const SYMBOL_ORDER: CanonicalSymbol[] = ['BTC', 'ETH', 'USDC']

export function formatTokenAmount(amount: number): string {
  if (amount === 0) return '0'
  const maximumFractionDigits = amount >= 1000 ? 0 : amount >= 1 ? 2 : 4
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(amount)
}

/** Aggregate per-chain raw balances by canonical asset and value them in USD. */
export function aggregateAssets(raws: RawAsset[], prices: PriceMap): EligibleBalance {
  const sums = new Map<CanonicalSymbol, bigint>()
  for (const { canonical, raw } of raws) {
    sums.set(canonical, (sums.get(canonical) ?? 0n) + raw)
  }

  const assets: AssetBalance[] = []
  for (const symbol of SYMBOL_ORDER) {
    const raw = sums.get(symbol) ?? 0n
    if (raw === 0n) continue
    const meta = CANONICAL_META[symbol]
    const amount = Number(formatUnits(raw, meta.decimals))
    const usdValue = amount * prices[meta.priceKey]
    assets.push({
      symbol,
      name: meta.name,
      amountRaw: raw,
      decimals: meta.decimals,
      amountDisplay: formatTokenAmount(amount),
      usdValue,
    })
  }

  assets.sort((a, b) => b.usdValue - a.usdValue)
  const totalUsd = assets.reduce((sum, asset) => sum + asset.usdValue, 0)
  return { totalUsd, assets }
}

export function computeEstimatedLimit(totalUsd: number): EstimatedLimit {
  return {
    limitUsd: totalUsd * ELIGIBILITY_LTV,
    utilizationPercent: 100, // fully available until the card is used
    utilizationCaption: 'Up to 80% of your eligible balance',
  }
}

/**
 * Derive card-credit figures from a flat asset list. Pure. `potential` is 80% of
 * everything detected (the ring's target); `ready` is 80% of held USDC (the fill).
 * Non-USDC value is never counted as ready credit — the user must convert it.
 */
export function summarizeEligibility(assets: AssetBalance[]): EligibilitySummary {
  let totalUsd = 0
  let usdcUsd = 0
  const groups = new Map<string, NetworkBreakdown>()

  for (const a of assets) {
    totalUsd += a.usdValue
    if (a.isUsdc) usdcUsd += a.usdValue

    const key = a.network ?? 'unknown'
    const group = groups.get(key) ?? { network: key, totalUsd: 0, usdcUsd: 0, assets: [] }
    group.totalUsd += a.usdValue
    if (a.isUsdc) group.usdcUsd += a.usdValue
    group.assets.push(a)
    groups.set(key, group)
  }

  const byNetwork = [...groups.values()].sort((x, y) => y.totalUsd - x.totalUsd)

  return {
    totalUsd,
    usdcUsd,
    potentialCreditUsd: totalUsd * ELIGIBILITY_LTV,
    readyCreditUsd: usdcUsd * ELIGIBILITY_LTV,
    fillPercent: totalUsd > 0 ? (usdcUsd / totalUsd) * 100 : 0,
    byNetwork,
  }
}
