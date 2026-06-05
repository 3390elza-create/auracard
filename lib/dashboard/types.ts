// Real dashboard domain types. These describe data derived from the connected
// wallet (on-chain balances) and from real session/load state — never mocked.

import type { Address } from '@/lib/web3/types'

// Token symbols are now arbitrary — we read every priced token a wallet holds,
// not a fixed whitelist.
export type AssetSymbol = string

export interface AssetBalance {
  symbol: AssetSymbol
  name: string
  amountRaw: bigint
  decimals: number
  amountDisplay: string
  usdValue: number
  logo?: string | null
  // Alchemy network id the holding sits on (portfolio path only). The aggregated
  // RPC path leaves these undefined — hence optional.
  network?: string
  isUsdc?: boolean
  // Cross-chain zap fields (portfolio path only):
  // numeric EVM chain id derived from `network`; null when unmapped.
  chainId?: number | null
  // ERC-20 contract address; null for the chain's native token.
  address?: Address | null
  // True when this holding is the chain's native gas token.
  isNative?: boolean
}

export type StepStatus = 'completed' | 'in_progress' | 'pending'
export type StepId = 'wallet_connected' | 'asset_analysis' | 'approval' | 'card_issued'

export interface ApprovalStep {
  id: StepId
  label: string
  status: StepStatus
  caption: string
}

export interface ApprovalProgress {
  steps: ApprovalStep[]
  percent: number
  etaLabel: string
}

export interface EligibleBalance {
  totalUsd: number
  assets: AssetBalance[]
}

export interface NetworkBreakdown {
  network: string
  totalUsd: number
  usdcUsd: number
  assets: AssetBalance[]
}

export interface EligibilitySummary {
  totalUsd: number
  usdcUsd: number
  potentialCreditUsd: number // 80% of totalUsd
  readyCreditUsd: number // 80% of usdcUsd
  fillPercent: number // usdcUsd / totalUsd * 100 (0 when total is 0)
  byNetwork: NetworkBreakdown[]
}

export interface EstimatedLimit {
  limitUsd: number
  utilizationPercent: number
  utilizationCaption: string
}

export type TimelineEventStatus = 'completed' | 'in_progress' | 'pending'

export interface TimelineEvent {
  id: string
  title: string
  description: string
  status: TimelineEventStatus
  timestamp: string
}

export interface DashboardData {
  progress: ApprovalProgress
  balance: EligibleBalance
  limit: EstimatedLimit
  timeline: TimelineEvent[]
}
