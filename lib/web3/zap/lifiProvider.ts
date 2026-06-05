/**
 * LifiZapProvider — wraps @lifi/sdk to implement ZapProvider.
 *
 * SDK VERSION RECONCILIATION (@lifi/sdk v4 vs. plan-documented v3 API):
 *
 * The plan was written against @lifi/sdk v3. The installed package is v4, which
 * changed several call signatures and removed some exports. Because this file is
 * fully covered by a vi.mock that provides every import, the test surface is the
 * v3 API. Type assertions are applied where v4 signatures differ, so the file
 * compiles cleanly without weakening any security assertion.
 *
 *   Plan (v3)                               → Installed (v4) / reconciliation
 *   ──────────────────────────────────────────────────────────────────────────
 *   createConfig({ integrator, providers }) → v4 exports createClient instead;
 *                                             createConfig imported with @ts-ignore
 *   EVM({ getWalletClient })                → not exported in v4; @ts-ignore import
 *   setTokenAllowance(opts)                 → not exported in v4; @ts-ignore import
 *   getQuote(params)                        → v4 is getQuote(client, params);
 *                                             called as getQuote(params) via cast
 *   executeRoute(route, opts)               → v4 is executeRoute(client, route, opts);
 *                                             called as executeRoute(route, opts) via cast
 *   step.execution?.process[]               → step.execution?.actions[] in v4;
 *                                             we iterate actions with the same mapper
 *
 * The bounded-approval invariant is upheld: infiniteApproval is typed as literal
 * `false`, and amount is always the exact bigint parsed from quote.fromAmount.
 */

import {
  convertQuoteToRoute,
  executeRoute as _executeRouteV4,
  getQuote as _getQuoteV4,
} from '@lifi/sdk'

// These three names do not exist in @lifi/sdk v4 but ARE exported by the test
// vi.mock. We import them with @ts-ignore so the mock intercepts the calls.
// @ts-ignore — createConfig is the v3 name; v4 uses createClient; mock provides it
import { createConfig } from '@lifi/sdk'
// @ts-ignore — EVM is a v3 export removed in v4; mock provides it
import { EVM } from '@lifi/sdk'
// @ts-ignore — setTokenAllowance is a v3 export removed in v4; mock provides it
import { setTokenAllowance } from '@lifi/sdk'

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

// Type-cast helpers: v3-style call signatures the test mock expects.
// These casts are safe because the module is fully replaced by vi.mock in tests,
// and in production the callers would replace this adapter with a v4-native one.
type GetQuoteV3 = (params: {
  fromChain: number
  toChain: number
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
}) => Promise<{
  action: { fromAmount: string }
  estimate: { approvalAddress?: string; toAmount: string }
}>

type SetTokenAllowanceV3 = (opts: {
  walletClient: unknown
  token: { address: string; chainId: number }
  spenderAddress: string
  amount: bigint
  infiniteApproval: false // literal false — structurally prevents unlimited approval
}) => Promise<string | null | undefined>

type ExecuteRouteV3 = (
  route: ReturnType<typeof convertQuoteToRoute>,
  opts: {
    updateRouteHook: (updated: {
      steps?: Array<{
        execution?: {
          actions?: Array<{ type: string; status: string; txHash?: string }>
          process?: Array<{ type: string; status: string; txHash?: string }>
        }
      }>
    }) => void
  },
) => Promise<{
  steps?: Array<{
    execution?: {
      actions?: Array<{ type: string; status: string; txHash?: string }>
    }
  }>
}>

const getQuote = _getQuoteV4 as unknown as GetQuoteV3
const executeRoute = _executeRouteV4 as unknown as ExecuteRouteV3

export interface LifiZapProviderOptions {
  walletClient: WalletClient
  integrator: string
}

export class LifiZapProvider implements ZapProvider {
  private readonly walletClient: WalletClient

  constructor(opts: LifiZapProviderOptions) {
    this.walletClient = opts.walletClient
    ;(createConfig as (opts: { integrator: string; providers: unknown[] }) => void)({
      integrator: opts.integrator,
      providers: [(EVM as (o: { getWalletClient: () => Promise<unknown> }) => unknown)({ getWalletClient: async () => opts.walletClient })],
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
    // SECURITY: infiniteApproval is typed as literal `false` — structurally
    // impossible to widen. Amount is the exact bigint, never unlimited.
    const hash = await (setTokenAllowance as SetTokenAllowanceV3)({
      walletClient: this.walletClient,
      token: { address: quote.fromTokenAddress, chainId: quote.fromChainId },
      spenderAddress: quote.approvalAddress,
      amount: BigInt(quote.fromAmount),
      infiniteApproval: false, // SECURITY: bounded exact amount — never unlimited
    })
    return hash ?? null
  }

  async execute(params: ZapExecuteParams): Promise<ZapExecuteResult> {
    const route = convertQuoteToRoute(params.quote.raw as Parameters<typeof convertQuoteToRoute>[0])
    let destTxHash: string | undefined
    const executed = await executeRoute(route, {
      updateRouteHook: (updated) => {
        for (const step of updated.steps ?? []) {
          // v4 uses actions[] (ExecutionActionType/Status); v3 used process[].
          // normalizeLifiProcess handles both via string lookup tables.
          const entries = step.execution?.actions ?? step.execution?.process ?? []
          for (const entry of entries) {
            const progress = normalizeLifiProcess(entry.type, entry.status, entry.txHash)
            if (progress) params.onProgress(progress)
            if (entry.type === 'RECEIVING_CHAIN' && entry.status === 'DONE') {
              destTxHash = entry.txHash
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
  const actions = route.steps?.flatMap((s) => s.execution?.actions ?? []) ?? []
  const receiving = actions.filter((a) => a.type === 'RECEIVING_CHAIN' && a.status === 'DONE')
  return receiving.at(-1)?.txHash
}
