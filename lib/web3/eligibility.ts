import { formatUnits } from 'viem'
import type { AssetBalance, EligibleBalance, EstimatedLimit } from '@/lib/dashboard/types'
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
