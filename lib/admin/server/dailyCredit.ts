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

// Combined per-day view: wallets that CONNECTED that day (from the DB) alongside
// the on-chain deposits. Connections and deposits are independent — a wallet can
// connect without depositing (and vice-versa).
export interface DailyRow {
  day: string // YYYY-MM-DD (UTC)
  connected: number // distinct wallets first seen that day
  depositors: number // distinct wallets that deposited that day
  totalUsd: number // total USDC released that day
}

/**
 * Pure: count wallets first seen per UTC day from their `firstSeenAt` ISO
 * timestamps. Each wallet is one User row, so a plain per-day count suffices.
 */
export function groupConnectionsByDay(firstSeenIso: string[]): Map<string, number> {
  const byDay = new Map<string, number>()
  for (const iso of firstSeenIso) {
    if (!iso) continue
    const day = iso.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }
  return byDay
}

/**
 * Pure: merge on-chain deposit rows with per-day connection counts into one
 * newest-first table. Always includes `today` (at zero) so the table never
 * collapses to an empty state, and unions every day that has either activity.
 */
export function mergeDailyRows(
  deposits: DailyCreditRow[],
  connections: Map<string, number>,
  today: string,
): DailyRow[] {
  const depByDay = new Map(deposits.map((d) => [d.day, d]))
  const days = new Set<string>([today, ...depByDay.keys(), ...connections.keys()])
  return [...days]
    .map((day) => ({
      day,
      connected: connections.get(day) ?? 0,
      depositors: depByDay.get(day)?.wallets ?? 0,
      totalUsd: depByDay.get(day)?.totalUsd ?? 0,
    }))
    .sort((a, b) => (a.day < b.day ? 1 : -1))
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
