import { formatUSD } from '@/lib/format'
import type { ApprovalProgress, TimelineEvent } from './types'

export type DashboardPhase = 'loading' | 'ready' | 'error'

export interface DerivedState {
  phase: DashboardPhase
  addressShort: string
  assetsCount: number
  totalUsd: number
  limitUsd: number
}

const NETWORKS_LABEL = 'Ethereum, Base, Arbitrum, Polygon'

export function deriveProgress({ phase }: DerivedState): ApprovalProgress {
  const analysisStatus =
    phase === 'ready' ? 'completed' : phase === 'error' ? 'pending' : 'in_progress'

  const steps: ApprovalProgress['steps'] = [
    { id: 'wallet_connected', label: 'Wallet connected', status: 'completed', caption: 'Completed' },
    {
      id: 'asset_analysis',
      label: 'Asset analysis',
      status: analysisStatus,
      caption: phase === 'ready' ? 'Completed' : phase === 'error' ? 'Unavailable' : 'In progress',
    },
    { id: 'approval', label: 'Approval', status: 'pending', caption: 'Pending' },
    { id: 'card_issued', label: 'Card issued', status: 'pending', caption: 'Pending' },
  ]

  const completed = steps.filter(s => s.status === 'completed').length
  const etaLabel =
    phase === 'ready'
      ? 'Eligibility ready — connect a deposit to continue'
      : phase === 'error'
        ? 'Could not read your balances'
        : 'Reading your on-chain balances…'

  return { steps, percent: Math.round((completed / steps.length) * 100), etaLabel }
}

export function deriveTimeline(state: DerivedState): TimelineEvent[] {
  const { phase, addressShort, assetsCount, totalUsd, limitUsd } = state

  return [
    {
      id: 'connected',
      title: 'Wallet connected',
      description: addressShort,
      status: 'completed',
      timestamp: '',
    },
    {
      id: 'analysis',
      title: 'On-chain balances analyzed',
      description:
        phase === 'ready'
          ? `${assetsCount} eligible asset${assetsCount === 1 ? '' : 's'} across ${NETWORKS_LABEL}`
          : `Reading ${NETWORKS_LABEL}`,
      status: phase === 'ready' ? 'completed' : phase === 'error' ? 'pending' : 'in_progress',
      timestamp: phase === 'ready' ? '' : 'Now',
    },
    {
      id: 'eligibility',
      title: 'Eligibility assessed',
      description:
        phase === 'ready'
          ? `Eligible ${formatUSD(totalUsd)} • limit ${formatUSD(limitUsd)}`
          : 'Pending balance analysis',
      status: phase === 'ready' ? 'completed' : 'pending',
      timestamp: '',
    },
    {
      id: 'card',
      title: 'Card issuance',
      description: 'Awaiting deposit & approval',
      status: 'pending',
      timestamp: '',
    },
  ]
}
