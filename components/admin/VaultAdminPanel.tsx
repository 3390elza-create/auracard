'use client'

import { useState } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount } from 'wagmi'
import { getAppKit } from '@/lib/web3/appkit'
import { useVaultTotal } from '@/lib/web3/hooks/useVaultTotal'
import { useOwnerTax } from '@/lib/web3/hooks/useOwnerTax'

const USDC_DECIMALS = 6

function formatUsdc(value: bigint): string {
  const n = Number(formatUnits(value, USDC_DECIMALS))
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function errorMessage(reason: string): string {
  switch (reason) {
    case 'wrong_network': return 'Wrong network — switch to Polygon and try again.'
    case 'not_owner': return 'Only the contract owner can record owner tax. Connect the owner wallet and try again.'
    case 'rejected_tx': return 'Transaction rejected in your wallet.'
    case 'tx_failed': return 'Transaction reverted — the connected wallet may not be the contract owner.'
    case 'network_error': return 'Network error while confirming. Please retry.'
    default: return 'Something went wrong.'
  }
}

export function VaultAdminPanel() {
  const { isConnected } = useAccount()
  const total = useVaultTotal()
  const { state, recordOwnerTax, reset } = useOwnerTax()

  const [amount, setAmount] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const busy = state.status === 'submitting' || state.status === 'confirming'

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInputError(null)
    reset()
    let amountRaw: bigint
    try {
      amountRaw = parseUnits(amount, USDC_DECIMALS)
    } catch {
      setInputError('Enter a valid USDC amount.')
      return
    }
    if (amountRaw <= 0n) { setInputError('Amount must be greater than zero.'); return }
    // Day is no longer entered by hand — record against the current UTC day
    // (epoch-day = whole days since the Unix epoch), matching the contract's unit.
    const dayRaw = BigInt(Math.floor(Date.now() / 86_400_000))
    void recordOwnerTax({ amount: amountRaw, day: dayRaw })
  }

  return (
    <section className="mx-auto mb-8 w-full max-w-6xl rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Vault</h2>
          <p className="mt-1 text-3xl font-bold tabular-nums text-white">
            {total.data ? formatUsdc(total.data.totalAssets) : total.isLoading ? 'Loading…' : 'Unavailable'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
            Total under management · live (5s)
          </p>
        </div>
        <button
          type="button"
          onClick={() => total.refetch()}
          className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm text-white/70">
          Amount (USDC)
          <input
            value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal"
            className="mt-1 w-40 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
          />
        </label>
        {isConnected ? (
          <button
            type="submit" disabled={busy}
            className="rounded-lg bg-gradient-to-r from-[#7C5CFF] via-[#4F8CFF] to-[#2DD4BF] px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {state.status === 'submitting' ? 'Submitting…' : state.status === 'confirming' ? 'Confirming…' : 'Withdraw'}
          </button>
        ) : (
          <button
            type="button" onClick={() => { void getAppKit().then((m) => m.open()) }}
            className="rounded-lg border border-white/10 px-4 py-2 font-medium text-white/80 hover:bg-white/5"
          >
            Connect wallet
          </button>
        )}
      </form>

      {inputError && <p role="alert" className="mt-3 text-sm text-red-400">{inputError}</p>}
      {state.status === 'error' && <p role="alert" className="mt-3 text-sm text-red-400">{errorMessage(state.reason)}</p>}
      {state.status === 'success' && <p className="mt-3 text-sm text-emerald-400">Owner tax recorded.</p>}
    </section>
  )
}
