import { describe, it, expect, vi } from 'vitest'
import { runCardApproval } from './useCardApproval'
import type { Address } from '@/lib/web3/types'

const USER = '0x1111111111111111111111111111111111111111' as Address

function makeDeps(overrides: Partial<Parameters<typeof runCardApproval>[0]> = {}) {
  return {
    address: USER,
    usdcBalance: 1_000_000n,
    chainId: 84532,
    readNonce: vi.fn().mockResolvedValue(0n),
    readTokenName: vi.fn().mockResolvedValue('Test USD Coin'),
    signTypedData: vi.fn().mockResolvedValue(
      '0x' + '11'.repeat(32) + '22'.repeat(32) + '1b',
    ),
    writeDeposit: vi.fn().mockResolvedValue('0xhash'),
    waitForReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
    nowSeconds: () => 1_000n,
    ...overrides,
  }
}

describe('runCardApproval', () => {
  it('signs an exact-80% permit then deposits and confirms', async () => {
    const deps = makeDeps()
    const result = await runCardApproval(deps)
    expect(deps.signTypedData).toHaveBeenCalledOnce()
    expect(deps.writeDeposit).toHaveBeenCalledWith(expect.objectContaining({ assets: 800_000n }))
    expect(result.status).toBe('active')
  })

  it('aborts on wrong network without signing', async () => {
    const deps = makeDeps({ chainId: 1 })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('wrong_network')
    expect(deps.signTypedData).not.toHaveBeenCalled()
  })

  it('reports rejected_signature when the user declines', async () => {
    const deps = makeDeps({ signTypedData: vi.fn().mockRejectedValue(new Error('User rejected')) })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('rejected_signature')
    expect(deps.writeDeposit).not.toHaveBeenCalled()
  })

  it('reports insufficient_balance when there is nothing to deposit', async () => {
    const deps = makeDeps({ usdcBalance: 0n })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('insufficient_balance')
  })
})
