import type {
  ApprovalProgress,
  DashboardData,
  EligibleBalance,
  EstimatedLimit,
  TimelineEvent,
} from './types'

export const MOCK_PROGRESS: ApprovalProgress = {
  percent: 45,
  etaLabel: 'Estimated completion: ~2h',
  steps: [
    { id: 'wallet_connected', label: 'Wallet connected', status: 'completed',   caption: 'Completed' },
    { id: 'asset_analysis',   label: 'Asset analysis',   status: 'in_progress', caption: 'In progress' },
    { id: 'approval',         label: 'Approval',         status: 'pending',     caption: 'Pending' },
    { id: 'card_issued',      label: 'Card issued',      status: 'pending',     caption: 'Pending' },
  ],
}

export const MOCK_BALANCE: EligibleBalance = {
  totalUsd: 28_500,
  assets: [
    { symbol: 'BTC',  name: 'Bitcoin',  amountRaw: 45_000_000n,                  decimals: 8,  amountDisplay: '0.45',  usdValue: 18_900 },
    { symbol: 'ETH',  name: 'Ethereum', amountRaw: 12_800_000_000_000_000_000n, decimals: 18, amountDisplay: '12.8',  usdValue: 4_600 },
    { symbol: 'USDC', name: 'USDC',     amountRaw: 5_000_000_000n,              decimals: 6,  amountDisplay: '5,000', usdValue: 5_000 },
  ],
}

export const MOCK_LIMIT: EstimatedLimit = {
  limitUsd: 9_000,
  utilizationPercent: 70,
  utilizationCaption: '70% ideal utilization rate',
}

export const MOCK_TIMELINE: TimelineEvent[] = [
  { id: 'liquidity', title: 'Liquidity verification completed', description: 'Assets verified across 3 networks',         status: 'completed',   timestamp: '10:42 AM' },
  { id: 'score',     title: 'On-chain credit score',            description: 'Processing transactional history (EVM)',     status: 'in_progress', timestamp: 'Now' },
  { id: 'keys',      title: 'Cryptographic key generation',     description: 'Pending final approval',                     status: 'pending',     timestamp: '—' },
]

export const MOCK_DASHBOARD: DashboardData = {
  progress: MOCK_PROGRESS,
  balance:  MOCK_BALANCE,
  limit:    MOCK_LIMIT,
  timeline: MOCK_TIMELINE,
}
