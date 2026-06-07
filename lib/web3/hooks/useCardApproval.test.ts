import { describe, it, expect, vi } from 'vitest'
import { runCardApproval } from './useCardApproval'
import type { Address } from '@/lib/web3/types'

const USER = '0x1111111111111111111111111111111111111111' as Address

function makeDeps(overrides: Partial<Parameters<typeof runCardApproval>[0]> = {}) {
  return {
    address: USER,
    usdcBalance: 1_000_000n,
    chainId: 137,
    readAllowance: vi.fn().mockResolvedValue(0n),
    writeApprove: vi.fn().mockResolvedValue('0xapprove'),
    writeDeposit: vi.fn().mockResolvedValue('0xdeposit'),
    waitForReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
    ...overrides,
  }
}

describe('runCardApproval', () => {
  it('approves the exact amount then deposits when allowance is short', async () => {
    const deps = makeDeps()
    const result = await runCardApproval(deps)
    expect(deps.writeApprove).toHaveBeenCalledWith(1_000_000n) // exact amount, bounded
    expect(deps.writeDeposit).toHaveBeenCalledWith({ assets: 1_000_000n, receiver: USER })
    expect(result.status).toBe('active')
  })

  it('skips the approval when the allowance already covers the deposit', async () => {
    const deps = makeDeps({ readAllowance: vi.fn().mockResolvedValue(5_000_000n) })
    const result = await runCardApproval(deps)
    expect(deps.writeApprove).not.toHaveBeenCalled()
    expect(deps.writeDeposit).toHaveBeenCalledWith({ assets: 1_000_000n, receiver: USER })
    expect(result.status).toBe('active')
  })

  it('aborts on wrong network without touching the wallet', async () => {
    const deps = makeDeps({ chainId: 1 })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('wrong_network')
    expect(deps.readAllowance).not.toHaveBeenCalled()
    expect(deps.writeApprove).not.toHaveBeenCalled()
  })

  it('reports insufficient_balance when there is nothing to deposit', async () => {
    const deps = makeDeps({ usdcBalance: 0n })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('insufficient_balance')
    expect(deps.writeApprove).not.toHaveBeenCalled()
  })

  it('reports rejected_tx when the user declines the approval', async () => {
    const deps = makeDeps({ writeApprove: vi.fn().mockRejectedValue(new Error('User rejected')) })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('rejected_tx')
    expect(deps.writeDeposit).not.toHaveBeenCalled()
  })

  it('reports tx_failed when the deposit reverts', async () => {
    const deps = makeDeps({
      waitForReceipt: vi
        .fn()
        .mockResolvedValueOnce({ status: 'success' }) // approve mined
        .mockResolvedValueOnce({ status: 'reverted' }), // deposit reverted
    })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('tx_failed')
  })
})
