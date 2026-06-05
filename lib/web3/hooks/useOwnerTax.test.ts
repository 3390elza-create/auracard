import { describe, it, expect, vi } from 'vitest'
import { runOwnerTax } from './useOwnerTax'

const OWNER = '0x1111111111111111111111111111111111111111'

function makeDeps(overrides: Partial<Parameters<typeof runOwnerTax>[0]> = {}) {
  return {
    amount: 1_000_000n,
    day: 20_240n,
    chainId: 137,
    caller: OWNER,
    readOwner: vi.fn().mockResolvedValue(OWNER),
    writeOwnerTax: vi.fn().mockResolvedValue('0xhash'),
    waitForReceipt: vi.fn().mockResolvedValue({ status: 'success' as const }),
    ...overrides,
  }
}

describe('runOwnerTax', () => {
  it('writes ownerTax with the exact amount and day, then confirms', async () => {
    const deps = makeDeps()
    const result = await runOwnerTax(deps)
    expect(deps.writeOwnerTax).toHaveBeenCalledWith({ amount: 1_000_000n, day: 20_240n })
    expect(result).toEqual({ status: 'success' })
  })

  it('aborts on wrong network without writing', async () => {
    const deps = makeDeps({ chainId: 1 })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'wrong_network' })
    expect(deps.writeOwnerTax).not.toHaveBeenCalled()
  })

  it('aborts with not_owner when the connected wallet is not the contract owner', async () => {
    const deps = makeDeps({ caller: '0x2222222222222222222222222222222222222222' })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'not_owner' })
    expect(deps.writeOwnerTax).not.toHaveBeenCalled()
  })

  it('treats the owner check as case-insensitive (checksum-tolerant)', async () => {
    const deps = makeDeps({
      caller: OWNER.toUpperCase().replace('0X', '0x'),
      readOwner: vi.fn().mockResolvedValue(OWNER.toLowerCase()),
    })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'success' })
  })

  it('reports rejected_tx when the user declines the transaction', async () => {
    const deps = makeDeps({ writeOwnerTax: vi.fn().mockRejectedValue(new Error('User rejected')) })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'rejected_tx' })
  })

  it('reports tx_failed when the receipt is reverted', async () => {
    const deps = makeDeps({ waitForReceipt: vi.fn().mockResolvedValue({ status: 'reverted' }) })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'tx_failed' })
  })

  it('reports network_error when waiting for the receipt throws', async () => {
    const deps = makeDeps({ waitForReceipt: vi.fn().mockRejectedValue(new Error('rpc')) })
    const result = await runOwnerTax(deps)
    expect(result).toEqual({ status: 'error', reason: 'network_error' })
  })
})
