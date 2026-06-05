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

