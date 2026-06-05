import { getUsdcAddress, getVaultAddress } from '@/lib/web3/vault/config'

// Credit released = USDC deposited into the vault. We read it from Alchemy's
// asset-transfer history (USDC transfers TO the vault) and bucket by UTC day.

export interface AssetTransfer {
  from: string | null
  value: number | null // token units (USDC ≈ USD)
  metadata?: { blockTimestamp?: string }
}

export interface DailyCreditRow {
  day: string // YYYY-MM-DD (UTC)
  wallets: number // distinct depositing wallets that day
  totalUsd: number // total USDC released that day
}

/**
 * Pure: bucket USDC-into-vault transfers by UTC day, summing value and counting
 * distinct sender wallets. Newest day first.
 */
export function groupTransfersByDay(transfers: AssetTransfer[]): DailyCreditRow[] {
  const byDay = new Map<string, { wallets: Set<string>; total: number }>()
  for (const t of transfers) {
    const ts = t.metadata?.blockTimestamp
    if (!ts) continue
    const day = ts.slice(0, 10) // ISO timestamp → YYYY-MM-DD (UTC)
    const value = typeof t.value === 'number' && Number.isFinite(t.value) ? t.value : 0
    const from = t.from ? t.from.toLowerCase() : null
    const entry = byDay.get(day) ?? { wallets: new Set<string>(), total: 0 }
    entry.total += value
    if (from) entry.wallets.add(from)
    byDay.set(day, entry)
  }
  return [...byDay.entries()]
    .map(([day, e]) => ({ day, wallets: e.wallets.size, totalUsd: e.total }))
    .sort((a, b) => (a.day < b.day ? 1 : -1))
}

/** Current UTC calendar day as YYYY-MM-DD. */
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Pure: guarantee a row for `today` (YYYY-MM-DD, UTC) exists, at zero, so a day
 * with no deposits still shows in the table instead of an empty state. Rows are
 * newest-first and today is the newest possible day, so it goes on top.
 */
export function withTodayRow(rows: DailyCreditRow[], today: string): DailyCreditRow[] {
  if (rows.some((r) => r.day === today)) return rows
  return [{ day: today, wallets: 0, totalUsd: 0 }, ...rows]
}

// alchemy_getAssetTransfers is an Alchemy-only RPC method, so we must hit an
// Alchemy endpoint (the public fallback RPC does not implement it).
function alchemyPolygonUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_RPC_URL_POLYGON
  if (url && url.includes('alchemy.com')) return url
  const explicit = process.env.ALCHEMY_API_KEY
  if (explicit) return `https://polygon-mainnet.g.alchemy.com/v2/${explicit}`
  const fromUrl = url?.match(/\/v2\/([^/?#]+)/)?.[1]
  return fromUrl ? `https://polygon-mainnet.g.alchemy.com/v2/${fromUrl}` : null
}

/**
 * Read every USDC deposit into the vault (paginated) and aggregate per day.
 * Server-only — uses the server's Alchemy endpoint. Throws if no Alchemy URL.
 */
export async function loadDailyVaultCredit(): Promise<DailyCreditRow[]> {
  const url = alchemyPolygonUrl()
  if (!url) throw new Error('alchemy polygon url unavailable')
  const vault = getVaultAddress()
  const usdc = getUsdcAddress()

  const collected: AssetTransfer[] = []
  let pageKey: string | undefined
  const MAX_PAGES = 10

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: '0x0',
            toBlock: 'latest',
            toAddress: vault,
            contractAddresses: [usdc],
            category: ['erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            order: 'asc',
            maxCount: '0x3e8', // 1000
            ...(pageKey ? { pageKey } : {}),
          },
        ],
      }),
    })
    if (!res.ok) break
    const json = (await res.json()) as { result?: { transfers?: AssetTransfer[]; pageKey?: string } }
    collected.push(...(json.result?.transfers ?? []))
    pageKey = json.result?.pageKey
    if (!pageKey) break
  }

  return groupTransfersByDay(collected)
}
