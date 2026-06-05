import {
  EVM,
  convertQuoteToRoute,
  createConfig,
  executeRoute,
  getQuote,
  setTokenAllowance,
} from '@lifi/sdk'
import type { WalletClient } from 'viem'
import { getUsdcAddress } from '@/lib/web3/vault/config'
import { ZAP_DEST_CHAIN_ID } from './types'
import { normalizeLifiProcess } from './provider'
import type {
  ZapExecuteParams,
  ZapExecuteResult,
  ZapProvider,
  ZapQuote,
  ZapQuoteParams,
} from './provider'

export interface LifiZapProviderOptions {
  walletClient: WalletClient
  integrator: string
}

// Live ZapProvider over @lifi/sdk v3. The ONLY file importing the SDK. Routes
// every input token to USDC on Polygon (Circle CCTP for the bridge leg).
// Approvals are always bounded — exact amount, infiniteApproval:false.
export class LifiZapProvider implements ZapProvider {
  private readonly walletClient: WalletClient

  constructor(opts: LifiZapProviderOptions) {
    this.walletClient = opts.walletClient
    createConfig({
      integrator: opts.integrator,
      providers: [EVM({ getWalletClient: async () => opts.walletClient })],
    })
  }

  async quote(params: ZapQuoteParams): Promise<ZapQuote> {
    const q = await getQuote({
      fromChain: params.fromChainId,
      toChain: ZAP_DEST_CHAIN_ID,
      fromToken: params.fromTokenAddress,
      toToken: getUsdcAddress(),
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
    })
    return {
      fromChainId: params.fromChainId,
      fromTokenAddress: params.fromTokenAddress,
      fromAmount: q.action.fromAmount,
      approvalAddress: q.estimate.approvalAddress ?? null,
      estToAmount: q.estimate.toAmount,
      isNative: params.isNative,
      raw: q,
    }
  }

  async approveExact(quote: ZapQuote): Promise<string | null> {
    if (quote.isNative || !quote.approvalAddress) return null
    const hash = await setTokenAllowance({
      walletClient: this.walletClient,
      token: { address: quote.fromTokenAddress, chainId: quote.fromChainId },
      spenderAddress: quote.approvalAddress,
      amount: BigInt(quote.fromAmount),
      infiniteApproval: false, // SECURITY: bounded, exact amount only — never unlimited
    })
    return hash ?? null
  }

  async execute(params: ZapExecuteParams): Promise<ZapExecuteResult> {
    const route = convertQuoteToRoute(params.quote.raw as Parameters<typeof convertQuoteToRoute>[0])
    let destTxHash: string | undefined
    const executed = await executeRoute(route, {
      updateRouteHook: (updated) => {
        for (const step of updated.steps ?? []) {
          for (const process of step.execution?.process ?? []) {
            const progress = normalizeLifiProcess(process.type, process.status, process.txHash)
            if (progress) params.onProgress(progress)
            if (process.type === 'RECEIVING_CHAIN' && process.status === 'DONE') {
              destTxHash = process.txHash
            }
          }
        }
      },
    })
    destTxHash ??= lastReceivingTxHash(executed)
    return { destTxHash }
  }
}

function lastReceivingTxHash(route: Awaited<ReturnType<typeof executeRoute>>): string | undefined {
  const processes = route.steps?.flatMap((s) => s.execution?.process ?? []) ?? []
  const receiving = processes.filter((p) => p.type === 'RECEIVING_CHAIN' && p.status === 'DONE')
  return receiving.at(-1)?.txHash
}
