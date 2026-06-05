import { NATIVE_SENTINEL } from './types'
import type {
  ZapExecuteParams,
  ZapExecuteResult,
  ZapProgress,
  ZapProvider,
  ZapQuote,
  ZapQuoteParams,
} from './provider'

export interface FakeZapConfig {
  estToAmount?: string
  approvalAddress?: string
  approvalTxHash?: string | null
  progress?: ZapProgress[]
  destTxHash?: string
  failExecute?: string
}

// Deterministic in-memory ZapProvider for tests: no network, scripted progress.
export class FakeZapProvider implements ZapProvider {
  constructor(private readonly config: FakeZapConfig) {}

  async quote(params: ZapQuoteParams): Promise<ZapQuote> {
    return {
      fromChainId: params.fromChainId,
      fromTokenAddress: params.fromTokenAddress,
      fromAmount: params.fromAmount,
      approvalAddress: params.isNative ? null : (this.config.approvalAddress ?? '0xSPENDER'),
      estToAmount: this.config.estToAmount ?? params.fromAmount,
      isNative: params.isNative,
      raw: { fake: true },
    }
  }

  async approveExact(quote: ZapQuote): Promise<string | null> {
    if (quote.isNative || quote.fromTokenAddress === NATIVE_SENTINEL) return null
    return this.config.approvalTxHash ?? '0xapprove'
  }

  async execute(params: ZapExecuteParams): Promise<ZapExecuteResult> {
    if (this.config.failExecute) throw new Error(this.config.failExecute)
    for (const p of this.config.progress ?? []) params.onProgress(p)
    return { destTxHash: this.config.destTxHash }
  }
}
