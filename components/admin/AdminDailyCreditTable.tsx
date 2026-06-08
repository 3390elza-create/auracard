'use client'

import { useCallback, useEffect, useState } from 'react'

interface DailyRow {
  day: string
  connected: number
  depositors: number
  totalUsd: number
}

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

export function AdminDailyCreditTable() {
  const [rows, setRows] = useState<DailyRow[] | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/daily-credit', { credentials: 'include' })
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as { days?: DailyRow[] }
      setRows(json.days ?? [])
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  // Load on mount, then refresh every 30s (this changes slowly vs. the 5s vault total).
  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), 30_000)
    return () => clearInterval(id)
  }, [load])

  const totalReleased = rows?.reduce((s, r) => s + r.totalUsd, 0) ?? 0

  return (
    <section className="mx-auto mb-8 w-full max-w-6xl rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Daily activity</h2>
          <p className="text-sm text-white/50">
            Wallets connected and USDC deposited into the vault, by day —{' '}
            <span className="text-white/90">{fmtUsd(totalReleased)} released total</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          Couldn&apos;t load daily credit. Check the Alchemy configuration and try again.
        </p>
      ) : rows === null ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="py-2 pr-4 font-medium">Day</th>
                <th className="py-2 pr-4 text-right font-medium">Connected</th>
                <th className="py-2 pr-4 text-right font-medium">Depositors</th>
                <th className="py-2 text-right font-medium">Credit released</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day} className="border-b border-white/5">
                  <td className="py-2 pr-4 text-white/90">{fmtDay(r.day)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-white/90">{r.connected}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-white/90">{r.depositors}</td>
                  <td className="py-2 text-right tabular-nums text-white/90">{fmtUsd(r.totalUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
