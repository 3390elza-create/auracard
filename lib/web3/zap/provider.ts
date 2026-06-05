import type { ZapChainId } from './types'

export type ZapStepKind = 'approval' | 'swap' | 'bridge' | 'receive'
export type ZapStepStatus = 'started' | 'pending' | 'done' | 'failed'

export interface ZapProgress {
  kind: ZapStepKind
  status: ZapStepStatus
  txHash?: string
}

export interface ZapQuoteParams {
  fromChainId: ZapChainId
  fromTokenAddress: string
  fromAmount: string
  fromAddress: string
  isNative: boolean
}

export interface ZapQuote {
  fromChainId: ZapChainId
  fromTokenAddress: string
  fromAmount: string
  approvalAddress: string | null
  estToAmount: string
  isNative: boolean
  raw: unknown
}

export interface ZapExecuteParams {
  quote: ZapQuote
  onProgress: (p: ZapProgress) => void
}

export interface ZapExecuteResult {
  destTxHash?: string
}

export interface ZapProvider {
  quote(params: ZapQuoteParams): Promise<ZapQuote>
  approveExact(quote: ZapQuote): Promise<string | null>
  execute(params: ZapExecuteParams): Promise<ZapExecuteResult>
}

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
