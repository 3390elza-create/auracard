import { afterEach, describe, expect, it, vi } from 'vitest'

const getQuote = vi.fn()
const convertQuoteToRoute = vi.fn((q: unknown) => ({ route: q }))
const executeRoute = vi.fn()
const setTokenAllowance = vi.fn()
const createConfig = vi.fn()
const EVM = vi.fn(() => ({ name: 'EVM' }))

// biome-ignore lint: any needed for mock spread compatibility
// eslint-disable-next-line
type AnyFn = (...a: any[]) => any
vi.mock('@lifi/sdk', () => ({
  getQuote: (...a: unknown[]) => (getQuote as AnyFn)(...a),
  convertQuoteToRoute: (...a: unknown[]) => (convertQuoteToRoute as AnyFn)(...a),
  executeRoute: (...a: unknown[]) => (executeRoute as AnyFn)(...a),
  setTokenAllowance: (...a: unknown[]) => (setTokenAllowance as AnyFn)(...a),
  createConfig: (...a: unknown[]) => (createConfig as AnyFn)(...a),
  EVM: (...a: unknown[]) => (EVM as AnyFn)(...a),
}))

import { LifiZapProvider } from './lifiProvider'
import type { ZapQuoteParams } from './provider'

const walletClient = { account: { address: '0xUSER' } } as never

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
    })
    const p = new LifiZapProvider({ walletClient, integrator: 'aura-card' })
    const quote = await p.quote(params)

    const arg = getQuote.mock.calls[0][0]
    expect(arg.fromChain).toBe(42161)
    expect(arg.toChain).toBe(137)
    expect(arg.toToken.toLowerCase()).toBe('0x3c499c542cef5e3811e1192ce70d8cc03d5c3359')
    expect(arg.fromAmount).toBe('1000000')
    expect(quote.approvalAddress).toBe('0xSPENDER')
    expect(quote.estToAmount).toBe('990000')
  })

  it('approves the EXACT amount with infiniteApproval:false (never unlimited)', async () => {
    setTokenAllowance.mockResolvedValue('0xapprove')
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
})
