import { describe, it, expect, vi } from 'vitest'
import type { PublicClient } from 'viem'
import { parseUnits } from 'viem'
import { readChainBalances } from './readBalances'
import { readPrices } from './prices'
import type { ChainConfig } from './config'
import type { Address } from '@/lib/web3/types'

const ADDRESS = '0x1111111111111111111111111111111111111111' as Address

const chain: ChainConfig = {
  id: 1,
  name: 'Ethereum',
  chain: {} as ChainConfig['chain'],
  rpcUrl: 'http://localhost',
  tokens: [
    { canonical: 'ETH', kind: 'native', decimals: 18 },
    { canonical: 'BTC', kind: 'erc20', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as Address, decimals: 8 },
    { canonical: 'USDC', kind: 'erc20', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, decimals: 6 },
  ],
}

describe('readChainBalances (mocked provider)', () => {
  it('reads native via getBalance and ERC-20s via multicall, dropping zeros', async () => {
    const client = {
      getBalance: vi.fn().mockResolvedValue(parseUnits('1.5', 18)),
      multicall: vi.fn().mockResolvedValue([
        { status: 'success', result: parseUnits('0.25', 8) }, // WBTC
        { status: 'success', result: 0n }, // USDC = 0, dropped
      ]),
    } as unknown as PublicClient

    const raws = await readChainBalances(client, chain, ADDRESS)

    expect(client.getBalance).toHaveBeenCalledWith({ address: ADDRESS })
    expect(raws).toEqual([
      { canonical: 'ETH', raw: parseUnits('1.5', 18) },
      { canonical: 'BTC', raw: parseUnits('0.25', 8) },
    ])
  })

  it('skips failed multicall entries without throwing', async () => {
    const client = {
      getBalance: vi.fn().mockResolvedValue(0n),
      multicall: vi.fn().mockResolvedValue([
        { status: 'failure', error: new Error('rpc') },
        { status: 'success', result: parseUnits('500', 6) },
      ]),
    } as unknown as PublicClient

    const raws = await readChainBalances(client, chain, ADDRESS)
    expect(raws).toEqual([{ canonical: 'USDC', raw: parseUnits('500', 6) }])
  })

  it('never calls a write method', async () => {
    const sendTransaction = vi.fn()
    const client = {
      getBalance: vi.fn().mockResolvedValue(0n),
      multicall: vi.fn().mockResolvedValue([
        { status: 'success', result: 0n },
        { status: 'success', result: 0n },
      ]),
      sendTransaction,
      writeContract: vi.fn(),
    } as unknown as PublicClient

    await readChainBalances(client, chain, ADDRESS)
    expect(sendTransaction).not.toHaveBeenCalled()
  })
})

describe('readPrices (mocked Chainlink)', () => {
  it('parses 8-decimal answers into USD numbers and pegs USDC', async () => {
    const client = {
      multicall: vi.fn().mockResolvedValue([
        [0n, 2000_00000000n, 0n, 0n, 0n], // ETH/USD = 2000
        [0n, 60000_00000000n, 0n, 0n, 0n], // BTC/USD = 60000
      ]),
    } as unknown as PublicClient

    const prices = await readPrices(client)
    expect(prices).toEqual({ ETH: 2000, BTC: 60000, USD: 1 })
  })
})
