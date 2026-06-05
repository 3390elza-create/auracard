import { describe, expect, it } from 'vitest'
import { FakeZapProvider } from './fakeProvider'
import type { ZapProgress, ZapQuoteParams } from './provider'

const params: ZapQuoteParams = {
  fromChainId: 42161,
  fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  fromAmount: '1000000',
  fromAddress: '0xUSER',
  isNative: false,
}

describe('FakeZapProvider', () => {
  it('quotes with a configurable estimated output and approval address', async () => {
    const p = new FakeZapProvider({ estToAmount: '990000', approvalAddress: '0xSPENDER' })
    const quote = await p.quote(params)
    expect(quote.fromAmount).toBe('1000000')
    expect(quote.estToAmount).toBe('990000')
    expect(quote.approvalAddress).toBe('0xSPENDER')
  })

  it('returns null approval for a native quote', async () => {
    const p = new FakeZapProvider({})
    const quote = await p.quote({ ...params, isNative: true, fromTokenAddress: '0x0000000000000000000000000000000000000000' })
    expect(await p.approveExact(quote)).toBeNull()
  })

  it('returns an approval hash for a non-native quote', async () => {
    const p = new FakeZapProvider({ approvalTxHash: '0xapprove' })
    const quote = await p.quote(params)
    expect(await p.approveExact(quote)).toBe('0xapprove')
  })

  it('emits the scripted progress sequence and resolves with the dest tx hash', async () => {
    const script: ZapProgress[] = [
      { kind: 'swap', status: 'done', txHash: '0xswap' },
      { kind: 'bridge', status: 'done', txHash: '0xbridge' },
      { kind: 'receive', status: 'done' },
    ]
    const p = new FakeZapProvider({ progress: script, destTxHash: '0xdeposit-src' })
    const seen: ZapProgress[] = []
    const result = await p.execute({ quote: await p.quote(params), onProgress: (e) => seen.push(e) })
    expect(seen).toEqual(script)
    expect(result.destTxHash).toBe('0xdeposit-src')
  })

  it('rejects execute when configured to fail', async () => {
    const p = new FakeZapProvider({ failExecute: 'boom' })
    await expect(p.execute({ quote: await p.quote(params), onProgress: () => {} })).rejects.toThrow('boom')
  })
})
