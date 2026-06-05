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
import { normalizeLifiProcess } from './lifiStatus'
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
  // Switch the wallet to a chain and return its wallet client. Required for
  // cross-chain routes: LI.FI moves the wallet to each source chain before
  // signing. Without it, a route that needs a different chain than the wallet's
  // current one cannot execute.
  switchChain?: (chainId: number) => Promise<WalletClient>
}

// @lifi/sdk's createConfig sets module-global state and must run once per app
// lifecycle. We configure once and let the active wallet client / switcher be
// swapped (e.g. on wallet reconnect) without clobbering the global config.
let lifiConfigured = false
let activeWalletClient: WalletClient | null = null
let activeSwitchChain: ((chainId: number) => Promise<WalletClient>) | undefined

function ensureLifiConfig(opts: LifiZapProviderOptions): void {
  activeWalletClient = opts.walletClient
  activeSwitchChain = opts.switchChain
  if (lifiConfigured) return
  createConfig({
    integrator: opts.integrator,
    providers: [
      EVM({
        getWalletClient: async () => {
          if (!activeWalletClient) throw new Error('LI.FI wallet client not set')
          return activeWalletClient
        },
        switchChain: async (chainId: number) => {
          if (!activeSwitchChain) throw new Error('LI.FI switchChain not provided')
          const client = await activeSwitchChain(chainId)
          activeWalletClient = client
          return client
        },
      }),
    ],
  })
  lifiConfigured = true
}

// Live ZapProvider over @lifi/sdk v3. The ONLY file importing the SDK. Routes
// every input token to USDC on Polygon (Circle CCTP for the bridge leg).
export class LifiZapProvider implements ZapProvider {
  private readonly walletClient: WalletClient

  constructor(opts: LifiZapProviderOptions) {
    this.walletClient = opts.walletClient
    ensureLifiConfig(opts)
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
    // SECURITY: bounded approval. The bound is enforced by passing the EXACT
    // amount (never a wallet-wide allowance). `infiniteApproval: false` is kept
    // as belt-and-suspenders, though it is @deprecated/ignored at runtime in
    // @lifi/sdk v3 — the `amount` is what guarantees the limit.
    const hash = await setTokenAllowance({
      walletClient: this.walletClient,
      token: { address: quote.fromTokenAddress, chainId: quote.fromChainId },
      spenderAddress: quote.approvalAddress,
      amount: BigInt(quote.fromAmount),
      infiniteApproval: false,
    })
    return hash ?? null
  }

  async execute(params: ZapExecuteParams): Promise<ZapExecuteResult> {
    const route = convertQuoteToRoute(params.quote.raw as Parameters<typeof convertQuoteToRoute>[0])
    let destTxHash: string | undefined
    // LI.FI re-fires updateRouteHook with the full process list on every
    // transition; dedupe so each (step, processType, status) is emitted once.
    const seen = new Map<string, string>()
    const executed = await executeRoute(route, {
      updateRouteHook: (updated) => {
        for (const step of updated.steps ?? []) {
          for (const process of step.execution?.process ?? []) {
            const key = `${step.id}:${process.type}`
            if (seen.get(key) === process.status) continue
            seen.set(key, process.status)
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
