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

function toZapToken(asset: AssetBalance, chainId: ZapChainId): ZapToken {
  return {
    chainId,
    address: asset.isNative ? NATIVE_SENTINEL : (asset.address as string),
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
  if (valueMicro <= 0n) return amountRaw // unpriced native: keep all, convert nothing
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
    if (!isZapChainId(asset.chainId ?? null)) {
      skipped.push({ token: asLooseToken(asset), reason: 'unsupported_chain' })
      continue
    }
    const chainId = asset.chainId as ZapChainId
    if (!asset.isNative && !asset.address) {
      skipped.push({ token: toZapToken(asset, chainId), reason: 'missing_address' })
      continue
    }

    const token = toZapToken(asset, chainId)

    let amountRaw: bigint
    let usdValue: number
    if (token.isNative) {
      const reserveRaw = nativeReserveRaw(token.amountRaw, token.usdValue, config.nativeReserveUsd)
      amountRaw = token.amountRaw - reserveRaw
      usdValue = token.usdValue - config.nativeReserveUsd
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

// For unsupported-chain skips we still want a token shape for display; chainId is
// not a ZapChainId, so build a best-effort token without the branded id.
function asLooseToken(asset: AssetBalance): ZapToken {
  return {
    chainId: (asset.chainId ?? 0) as ZapChainId,
    address: asset.isNative ? NATIVE_SENTINEL : (asset.address ?? ''),
    symbol: asset.symbol,
    decimals: asset.decimals,
    amountRaw: asset.amountRaw,
    usdValue: asset.usdValue,
    isUsdc: Boolean(asset.isUsdc),
    isNative: Boolean(asset.isNative),
  }
}
