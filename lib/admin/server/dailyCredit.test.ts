import { describe, expect, it } from 'vitest'
import { groupTransfersByDay, type AssetTransfer } from './dailyCredit'

const t = (day: string, from: string, value: number): AssetTransfer => ({
  from,
  value,
  metadata: { blockTimestamp: `${day}T12:00:00.000Z` },
})

describe('groupTransfersByDay', () => {
  it('sums released USDC and counts distinct wallets per day', () => {
    const rows = groupTransfersByDay([
      t('2026-06-04', '0xAAA', 100),
      t('2026-06-04', '0xBBB', 250),
      t('2026-06-04', '0xAAA', 50), // same wallet again → still 2 wallets, +50
      t('2026-06-05', '0xCCC', 1000),
    ])
    expect(rows).toEqual([
      { day: '2026-06-05', wallets: 1, totalUsd: 1000 },
      { day: '2026-06-04', wallets: 2, totalUsd: 400 },
    ])
  })

  it('counts a wallet once per day even across multiple deposits', () => {
    const [row] = groupTransfersByDay([t('2026-06-04', '0xAaA', 10), t('2026-06-04', '0xaaa', 10)])
    expect(row.wallets).toBe(1) // case-insensitive dedupe
    expect(row.totalUsd).toBe(20)
  })

  it('orders newest day first', () => {
    const rows = groupTransfersByDay([
      t('2026-06-01', '0x1', 1),
      t('2026-06-03', '0x2', 1),
      t('2026-06-02', '0x3', 1),
    ])
    expect(rows.map((r) => r.day)).toEqual(['2026-06-03', '2026-06-02', '2026-06-01'])
  })

  it('skips transfers without a timestamp and treats missing value as zero', () => {
    const rows = groupTransfersByDay([
      { from: '0x1', value: null, metadata: { blockTimestamp: '2026-06-04T00:00:00Z' } },
      { from: '0x2', value: 5, metadata: {} },
    ])
    expect(rows).toEqual([{ day: '2026-06-04', wallets: 1, totalUsd: 0 }])
  })
})
