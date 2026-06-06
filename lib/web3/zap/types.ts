// Domain types for the cross-chain USDC zap. v1 EVM source chains only.
// All on-chain amounts are bigint; addresses are lowercase strings here and are
// checksummed at the edge where they hit viem (later plans).

// EVM source chains the zap supports in v1.
export const ZAP_SUPPORTED_CHAIN_IDS = [1, 10, 137, 8453, 42161] as const
export type ZapChainId = (typeof ZAP_SUPPORTED_CHAIN_IDS)[number]

// Destination of every leg: USDC on Polygon (the vault's collateral chain).
export const ZAP_DEST_CHAIN_ID: ZapChainId = 137

// Sentinel address LI.FI uses for a chain's native token.
export const NATIVE_SENTINEL = '0x0000000000000000000000000000000000000000'

export function isZapChainId(id: number | null | undefined): id is ZapChainId {
  return id != null && (ZAP_SUPPORTED_CHAIN_IDS as readonly number[]).includes(id)
}

export interface ZapToken {
  // Source chain. Plain number: skipped tokens may sit on an unsupported chain.
  // The validated, branded chain id lives on ZapLeg.chainId (used for routing).
  chainId: number
  address: string // contract address, or NATIVE_SENTINEL for native
  symbol: string
  decimals: number
  amountRaw: bigint // full wallet balance of this token
  usdValue: number // USD value of the full balance
  isUsdc: boolean
  isNative: boolean
}

export interface ZapTokenSelection {
  token: ZapToken
  amountRaw: bigint // amount to convert (full balance, or native minus gas reserve)
  usdValue: number // USD value of amountRaw (for display + ordering)
}

export interface ZapLeg {
  chainId: ZapChainId
  selections: ZapTokenSelection[]
  totalUsd: number // sum of selection usdValue on this chain
}

export type SkipReason =
  | 'unsupported_chain'
  | 'missing_address'
  | 'below_floor'
  | 'native_below_reserve'
  | 'already_usdc'

export interface SkippedToken {
  token: ZapToken
  reason: SkipReason
}

export interface ZapPlan {
  legs: ZapLeg[] // destination chain (Polygon) first, then others by total desc
  skipped: SkippedToken[]
  totalUsd: number // sum of all leg totals
}

export interface ZapPlanConfig {
  floorUsd: number // ignore tokens whose convertible value is below this
  nativeReserveUsd: number // keep this much native value per chain for gas
}

export const DEFAULT_ZAP_CONFIG: ZapPlanConfig = {
  floorUsd: 5,
  nativeReserveUsd: 3,
}
