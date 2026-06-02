export type Address = `0x${string}`

export type AssetSymbol = 'BTC' | 'ETH' | 'USDC'

export interface AssetBalance {
  symbol: AssetSymbol
  name: string
  amountRaw: bigint
  decimals: number
  amountDisplay: string
  usdValue: number
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

export interface WalletSession {
  address: Address
  addressShort: string
  chainId: number
  chainName: string
}

export interface DashboardData {
  wallet: WalletSession
  progress: ApprovalProgress
  balance: EligibleBalance
  limit: EstimatedLimit
  timeline: TimelineEvent[]
}
