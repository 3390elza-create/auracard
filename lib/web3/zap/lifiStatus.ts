import type { ZapProgress, ZapStepKind, ZapStepStatus } from './provider'

const KIND_BY_TYPE: Record<string, ZapStepKind> = {
  TOKEN_ALLOWANCE: 'approval',
  SWAP: 'swap',
  CROSS_CHAIN: 'bridge',
  RECEIVING_CHAIN: 'receive',
}

const STATUS_BY_LIFI: Record<string, ZapStepStatus> = {
  STARTED: 'started',
  ACTION_REQUIRED: 'started',
  PENDING: 'pending',
  DONE: 'done',
  FAILED: 'failed',
  CANCELLED: 'failed',
}

/**
 * Pure: translate a LI.FI execution process (type + status) into normalized zap
 * progress. Returns null for process types/statuses we don't surface.
 */
export function normalizeLifiProcess(type: string, status: string, txHash?: string): ZapProgress | null {
  const kind = KIND_BY_TYPE[type]
  const normStatus = STATUS_BY_LIFI[status]
  if (!kind || !normStatus) return null
  return txHash ? { kind, status: normStatus, txHash } : { kind, status: normStatus }
}
