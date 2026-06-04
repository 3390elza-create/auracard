'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUserRow } from '@/lib/admin/types'

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatUsd(value: number | null): string {
  if (value === null) return 'Unavailable'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function AdminUsersTable({ adminEmail }: { adminEmail: string }) {
  const router = useRouter()
  const [rows, setRows] = useState<AdminUserRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/users')
      .then(async res => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then(json => { if (active) setRows(json.users as AdminUserRow[]) })
      .catch(() => { if (active) setError('Could not load users.') })
    return () => { active = false }
  }, [])

  async function onLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="text-sm text-white/50">Signed in as {adminEmail}</p>
        </div>
        <button onClick={onLogout} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
          Sign out
        </button>
      </header>

      {error && <p role="alert" className="text-red-400">{error}</p>}
      {!error && !rows && <p className="text-white/50">Loading users…</p>}

      {rows && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Wallet</th>
                <th className="px-4 py-3 font-medium">Chain</th>
                <th className="px-4 py-3 font-medium">Value (USD)</th>
                <th className="px-4 py-3 font-medium">Card status</th>
                <th className="px-4 py-3 font-medium">First seen</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="text-white/90">
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-white/50">No users yet.</td></tr>
              )}
              {rows.map(row => (
                <tr key={row.walletAddress} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono" title={row.walletAddress}>{shortAddress(row.walletAddress)}</td>
                  <td className="px-4 py-3">{row.chainId}</td>
                  <td className="px-4 py-3">{formatUsd(row.totalUsd)}</td>
                  <td className="px-4 py-3 capitalize">{row.cardStatus}</td>
                  <td className="px-4 py-3 text-white/60">{new Date(row.firstSeenAt).toLocaleDateString('en-US')}</td>
                  <td className="px-4 py-3 text-white/60">{new Date(row.lastLoginAt).toLocaleDateString('en-US')}</td>
                  <td className="px-4 py-3">
                    {/* Mock-only: performs no on-chain action and changes no state. */}
                    <button
                      type="button"
                      onClick={() => alert('Claim is a mock — no action performed.')}
                      className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
                    >
                      Claim
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
