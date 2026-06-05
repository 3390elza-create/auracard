import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@lifi/sdk', () => ({
  getQuote: vi.fn(),
  convertQuoteToRoute: vi.fn((q: unknown) => ({ route: q })),
  executeRoute: vi.fn(),
  setTokenAllowance: vi.fn(),
  createConfig: vi.fn(),
  EVM: vi.fn(() => ({ name: 'EVM' })),
}))

import * as lifi from '@lifi/sdk'
import type { WalletClient } from 'viem'
import { LifiZapProvider } from './lifiProvider'
import type { ZapProgress, ZapQuoteParams } from './provider'

const getQuote = vi.mocked(lifi.getQuote)
const setTokenAllowance = vi.mocked(lifi.setTokenAllowance)
const executeRoute = vi.mocked(lifi.executeRoute)

const walletClient = { account: { address: '0xUSER' } } as unknown as WalletClient

const params: ZapQuoteParams = {
  fromChainId: 42161,
  fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  fromAmount: '1000000',
  fromAddress: '0xUSER',
  isNative: false,
}

afterEach(() => vi.clearAllMocks())

describe('LifiZapProvider', () => {
  it('quotes targeting USDC on Polygon (chain 137)', async () => {
    getQuote.mockResolvedValue({
      action: { fromAmount: '1000000' },
      estimate: { approvalAddress: '0xSPENDER', toAmount: '990000' },
    } as never)
    const p = new LifiZapProvider({ walletClient, integrator: 'aura-card' })
    const quote = await p.quote(params)

    // Cast to QuoteRequestFromAmount so TypeScript sees fromAmount (not removed by ToAmount overload)
    const arg = getQuote.mock.calls[0][0] as unknown as import('@lifi/sdk').QuoteRequestFromAmount
    expect(arg.fromChain).toBe(42161)
    expect(arg.toChain).toBe(137)
    expect(arg.toToken.toLowerCase()).toBe('0x3c499c542cef5e3811e1192ce70d8cc03d5c3359')
    expect(arg.fromAmount).toBe('1000000')
    expect(quote.approvalAddress).toBe('0xSPENDER')
    expect(quote.estToAmount).toBe('990000')
  })

  it('approves the EXACT amount with infiniteApproval:false (never unlimited)', async () => {
    setTokenAllowance.mockResolvedValue('0xapprove' as never)
    const p = new LifiZapProvider({ walletClient, integrator: 'aura-card' })
    const quote = {
      fromChainId: 42161 as const,
      fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      fromAmount: '1000000',
      approvalAddress: '0xSPENDER',
      estToAmount: '990000',
      isNative: false,
      raw: {},
    }
    const hash = await p.approveExact(quote)

    const arg = setTokenAllowance.mock.calls[0][0]
    expect(arg.infiniteApproval).toBe(false)
    expect(arg.amount).toBe(1000000n)
    expect(arg.spenderAddress).toBe('0xSPENDER')
    expect(hash).toBe('0xapprove')
  })

  it('skips approval for native and for a missing spender', async () => {
    const p = new LifiZapProvider({ walletClient, integrator: 'aura-card' })
    expect(
      await p.approveExact({
        fromChainId: 1, fromTokenAddress: '0x0000000000000000000000000000000000000000',
        fromAmount: '1', approvalAddress: null, estToAmount: '1', isNative: true, raw: {},
      }),
    ).toBeNull()
    expect(setTokenAllowance).not.toHaveBeenCalled()
  })

  it('emits deduped progress and returns the receiving-chain destTxHash', async () => {
    executeRoute.mockImplementation(
      (async (_route: unknown, opts: { updateRouteHook?: (r: unknown) => void } = {}) => {
        const fire = (process: Array<{ type: string; status: string; txHash?: string }>) =>
          opts.updateRouteHook?.({ steps: [{ id: 's1', execution: { process } }] })
        fire([{ type: 'SWAP', status: 'STARTED' }])
        fire([
          { type: 'SWAP', status: 'STARTED' }, // replay -> deduped
          { type: 'SWAP', status: 'DONE', txHash: '0xswap' },
        ])
        fire([
          { type: 'SWAP', status: 'DONE', txHash: '0xswap' }, // replay -> deduped
          { type: 'RECEIVING_CHAIN', status: 'DONE', txHash: '0xrecv' },
        ])
        return { steps: [{ id: 's1', execution: { process: [
          { type: 'SWAP', status: 'DONE', txHash: '0xswap' },
          { type: 'RECEIVING_CHAIN', status: 'DONE', txHash: '0xrecv' },
        ] } }] }
      }) as Parameters<typeof executeRoute.mockImplementation>[0],
    )
    const p = new LifiZapProvider({ walletClient, integrator: 'aura-card' })
    const quote = {
      fromChainId: 42161 as const,
      fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      fromAmount: '1000000', approvalAddress: '0xSPENDER', estToAmount: '990000',
      isNative: false, raw: {},
    }
    const seen: ZapProgress[] = []
    const res = await p.execute({ quote, onProgress: (e) => seen.push(e) })
    expect(seen).toEqual([
      { kind: 'swap', status: 'started' },
      { kind: 'swap', status: 'done', txHash: '0xswap' },
      { kind: 'receive', status: 'done', txHash: '0xrecv' },
    ])
    expect(res.destTxHash).toBe('0xrecv')
  })
})
