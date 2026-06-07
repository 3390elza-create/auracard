import type { AssetBalance } from '@/lib/dashboard/types'
import {
  DEFAULT_ZAP_CONFIG,
  NATIVE_SENTINEL,
  ZAP_DEST_CHAIN_ID,
  isZapChainId,
  type SkippedToken,
  type ZapChainId,
  type ZapLeg,
  type ZapPlan,
  type ZapPlanConfig,
  type ZapToken,
  type ZapTokenSelection,
} from './types'

const MICRO = 1_000_000 // integer micro-USD scale for float-free reserve math

function toZapToken(asset: AssetBalance, chainId: number): ZapToken {
  return {
    chainId,
    address: asset.isNative ? NATIVE_SENTINEL : (asset.address ?? ''),
    symbol: asset.symbol,
    decimals: asset.decimals,
    amountRaw: asset.amountRaw,
    usdValue: asset.usdValue,
    isUsdc: Boolean(asset.isUsdc),
    isNative: Boolean(asset.isNative),
  }
}

/** Raw amount to keep as native gas reserve, via integer micro-USD scaling. */
function nativeReserveRaw(amountRaw: bigint, usdValue: number, reserveUsd: number): bigint {
  const valueMicro = BigInt(Math.round(usdValue * MICRO))
  if (valueMicro <= 0n) return amountRaw // unpriced native: reserve all -> caller converts nothing (then skips)
  const reserveMicro = BigInt(Math.round(reserveUsd * MICRO))
  const reserveRaw = (amountRaw * reserveMicro) / valueMicro
  return reserveRaw > amountRaw ? amountRaw : reserveRaw
}

/**
 * Pure: decide which holdings to convert to USDC and group them per source chain.
 * Native holdings keep a gas reserve; everything else converts in full. Tokens on
 * unsupported chains, without an address, or below the floor are skipped with a
 * reason. Legs are ordered with the destination chain (Polygon) first.
 */
export function buildZapPlan(
  assets: AssetBalance[],
  config: ZapPlanConfig = DEFAULT_ZAP_CONFIG,
): ZapPlan {
  const skipped: SkippedToken[] = []
  const byChain = new Map<ZapChainId, ZapTokenSelection[]>()

  for (const asset of assets) {
    const rawChainId = asset.chainId ?? null
    if (!isZapChainId(rawChainId)) {
      skipped.push({ token: toZapToken(asset, asset.chainId ?? 0), reason: 'unsupported_chain' })
      continue
    }
    const chainId: ZapChainId = rawChainId // narrowed by isZapChainId guard above
    if (!asset.isNative && !asset.address) {
      skipped.push({ token: toZapToken(asset, chainId), reason: 'missing_address' })
      continue
    }

    const token = toZapToken(asset, chainId)

    // Destination-chain USDC needs no swap/bridge — the final deposit sweeps it.
    if (token.isUsdc && chainId === ZAP_DEST_CHAIN_ID) {
      skipped.push({ token, reason: 'already_usdc' })
      continue
    }

    let amountRaw: bigint
    let usdValue: number
    if (token.isNative) {
      const reserveUsd = config.nativeReserveUsdByChain[chainId] ?? 0.5
      const reserveRaw = nativeReserveRaw(token.amountRaw, token.usdValue, reserveUsd)
      amountRaw = token.amountRaw - reserveRaw
      // USD of the converted remainder = holding value minus the reserved gas
      // value. (Differs from amountRaw only by sub-cent integer-division rounding.)
      usdValue = token.usdValue - reserveUsd
      if (amountRaw <= 0n || usdValue < config.floorUsd) {
        skipped.push({ token, reason: 'native_below_reserve' })
        continue
      }
    } else {
      amountRaw = token.amountRaw
      usdValue = token.usdValue
      if (usdValue < config.floorUsd) {
        skipped.push({ token, reason: 'below_floor' })
        continue
      }
    }

    const list = byChain.get(chainId) ?? []
    list.push({ token, amountRaw, usdValue })
    byChain.set(chainId, list)
  }

  const legs: ZapLeg[] = [...byChain.entries()].map(([chainId, selections]) => ({
    chainId,
    selections,
    totalUsd: selections.reduce((sum, s) => sum + s.usdValue, 0),
  }))

  legs.sort((a, b) => {
    if (a.chainId === ZAP_DEST_CHAIN_ID) return -1
    if (b.chainId === ZAP_DEST_CHAIN_ID) return 1
    return b.totalUsd - a.totalUsd
  })

  return { legs, skipped, totalUsd: legs.reduce((sum, l) => sum + l.totalUsd, 0) }
}

/** Sum of native-token USD value held per chain (the gas budget on that chain). */
function nativeUsdByChain(assets: AssetBalance[]): Map<ZapChainId, number> {
  const map = new Map<ZapChainId, number>()
  for (const asset of assets) {
    if (!asset.isNative) continue
    const chainId = asset.chainId ?? null
    if (!isZapChainId(chainId)) continue
    map.set(chainId, (map.get(chainId) ?? 0) + asset.usdValue)
  }
  return map
}

/**
 * Pure: drop legs the wallet can't actually execute for lack of native gas.
 *
 * Swapping/bridging an ERC-20 needs native gas on its source chain. A leg made
 * of ONLY ERC-20s on a chain whose native balance is below `minGasUsdByChain`
 * has no gas to run, so its tokens are moved to `skipped` ('insufficient_gas')
 * instead of failing on-chain. Legs that include a native selection are left
 * alone — their gas is covered by the reserve kept in `buildZapPlan`.
 */
export function filterLegsByGas(
  plan: ZapPlan,
  assets: AssetBalance[],
  config: ZapPlanConfig = DEFAULT_ZAP_CONFIG,
): ZapPlan {
  const gasUsd = nativeUsdByChain(assets)
  const legs: ZapLeg[] = []
  const skipped: SkippedToken[] = [...plan.skipped]

  for (const leg of plan.legs) {
    const hasNative = leg.selections.some((s) => s.token.isNative)
    const minGasUsd = config.minGasUsdByChain[leg.chainId] ?? 0.15
    if (!hasNative && (gasUsd.get(leg.chainId) ?? 0) < minGasUsd) {
      for (const s of leg.selections) skipped.push({ token: s.token, reason: 'insufficient_gas' })
      continue
    }
    legs.push(leg)
  }

  return { legs, skipped, totalUsd: legs.reduce((sum, l) => sum + l.totalUsd, 0) }
}
