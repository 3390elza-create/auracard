import type { ZapLeg, ZapPlan } from './types'
import type { ZapProgress, ZapProvider } from './provider'
import type { LegEvent, LegStatus } from './machine'

export interface DepositResult {
  status: 'active' | 'error'
  reason?: string
}

export interface ZapDeps {
  provider: ZapProvider
  fromAddress: string
  dispatch: (chainId: number, event: LegEvent) => void
  deposit: () => Promise<DepositResult>
}

const STATUS_BY_KIND: Record<Exclude<ZapProgress['kind'], 'approval'>, LegStatus> = {
  swap: 'swapping',
  bridge: 'bridging',
  receive: 'arriving',
}

const TXFIELD_BY_KIND: Record<Exclude<ZapProgress['kind'], 'approval'>, 'swapTxHash' | 'bridgeTxHash' | 'destTxHash'> = {
  swap: 'swapTxHash',
  bridge: 'bridgeTxHash',
  receive: 'destTxHash',
}

/**
 * Pure: translate normalized provider progress into a leg event. Approval
 * progress returns null (the orchestrator approves explicitly before execute).
 */
export function mapProgressToEvent(p: ZapProgress): LegEvent | null {
  if (p.status === 'failed') return { type: 'FAIL', reason: `${p.kind}_failed` }
  if (p.kind === 'approval') return null
  const to = STATUS_BY_KIND[p.kind]
  if (!p.txHash) return { type: 'ADVANCE', to }
  return { type: 'ADVANCE', to, data: { [TXFIELD_BY_KIND[p.kind]]: p.txHash } }
}

/** Run every selection of one leg: quote → bounded approve → execute (swap+bridge). */
export async function runZapLeg(leg: ZapLeg, deps: ZapDeps): Promise<void> {
  for (const sel of leg.selections) {
    deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'quoting' })
    const quote = await deps.provider.quote({
      fromChainId: leg.chainId,
      fromTokenAddress: sel.token.address,
      fromAmount: sel.amountRaw.toString(),
      fromAddress: deps.fromAddress,
      isNative: sel.token.isNative,
    })

    deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'awaiting_approval' })
    const approvalTxHash = await deps.provider.approveExact(quote)
    if (approvalTxHash) {
      // idempotent same-status merge: record the approval tx without a transition
      deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'awaiting_approval', data: { approvalTxHash } })
    }

    await deps.provider.execute({
      quote,
      onProgress: (p) => {
        const event = mapProgressToEvent(p)
        if (event) deps.dispatch(leg.chainId, event)
      },
    })
  }
}

/**
 * Orchestrate a whole plan: each leg sequentially through swap+bridge, then ONE
 * Polygon deposit of the arrived USDC. Stops and returns an error if any leg
 * fails (its FAIL event is already dispatched).
 */
export async function runZap(plan: ZapPlan, deps: ZapDeps): Promise<DepositResult> {
  for (const leg of plan.legs) {
    try {
      await runZapLeg(leg, deps)
    } catch (err) {
      deps.dispatch(leg.chainId, { type: 'FAIL', reason: err instanceof Error ? err.message : 'leg_failed' })
      return { status: 'error', reason: 'leg_failed' }
    }
  }
  for (const leg of plan.legs) deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'depositing' })
  const result = await deps.deposit()
  if (result.status === 'active') {
    for (const leg of plan.legs) deps.dispatch(leg.chainId, { type: 'ADVANCE', to: 'done' })
  }
  return result
}
