'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignMessage, useSwitchChain } from 'wagmi'
import { getAccount } from 'wagmi/actions'
import { useQueryClient } from '@tanstack/react-query'
import { getAppKit } from '@/lib/web3/appkit'
import { wagmiConfig } from '@/lib/web3/wagmi'
import { buildSiweMessage } from '@/lib/web3/siwe'
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains'
import type { Address, SiweLoginState } from '@/lib/web3/types'

export type WalletId = 'walletconnect' | 'metamask' | 'coinbase' | 'rainbow'

export interface UseSiweLoginReturn {
  state: SiweLoginState
  start: (walletId: WalletId, redirectTo?: string) => Promise<void>
  reset: () => void
}

const CONNECT_TIMEOUT_MS = 60_000
// After the AppKit modal closes, give wagmi a brief window to report the
// connection before treating the dismissal as a cancellation.
const CONNECT_GRACE_MS = 1_500

type ConnectedAccount = { address: Address; chainId: number }

/**
 * Dependencies for {@link waitForConnection}. Injected so the abort-on-close
 * behaviour can be tested without a live AppKit/wagmi instance.
 */
export interface ConnectionWatcher {
  /** Current connected account, or null if not connected yet. */
  getAccount: () => ConnectedAccount | null
  /** Subscribe to the AppKit modal open state; returns an unsubscribe fn. */
  subscribeModalOpen: (cb: (open: boolean) => void) => () => void
  now: () => number
  schedule: (fn: () => void, ms: number) => void
  timeoutMs: number
  graceMs?: number
}

/**
 * Resolves with the connected account, or null if the attempt is cancelled.
 *
 * The wait is abortable: once the AppKit wallet-selection modal has opened and
 * then closed without a connection, the deadline collapses to a short grace
 * window instead of blocking for the full {@link CONNECT_TIMEOUT_MS}. This is
 * what keeps the UI from getting stuck on "Connecting…" when the user dismisses
 * the wallet sheet, loses connectivity, or otherwise bails out.
 */
export function waitForConnection(w: ConnectionWatcher): Promise<ConnectedAccount | null> {
  const graceMs = w.graceMs ?? CONNECT_GRACE_MS
  return new Promise((resolve) => {
    const startedAt = w.now()
    let deadline = startedAt + w.timeoutMs
    let sawOpen = false
    let done = false
    let unsub: (() => void) | undefined

    const finish = (value: ConnectedAccount | null) => {
      if (done) return
      done = true
      unsub?.()
      resolve(value)
    }

    unsub = w.subscribeModalOpen((open) => {
      if (open) {
        sawOpen = true
        return
      }
      // Modal dismissed after having been open: shorten the deadline so a
      // cancellation resolves in ~grace instead of after the full timeout.
      if (sawOpen) deadline = Math.min(deadline, w.now() + graceMs)
    })

    const tick = () => {
      if (done) return
      const acc = w.getAccount()
      if (acc) return finish(acc)
      if (w.now() >= deadline) return finish(null)
      w.schedule(tick, 200)
    }
    tick()
  })
}

export function useSiweLogin(): UseSiweLoginReturn {
  const [state, setState] = useState<SiweLoginState>({ status: 'idle' })
  const { signMessageAsync } = useSignMessage()
  const { switchChainAsync } = useSwitchChain()
  const router = useRouter()
  const queryClient = useQueryClient()
  const inFlight = useRef(false)

  async function start(_walletId: WalletId, redirectTo: string = '/dashboard'): Promise<void> {
    if (inFlight.current) return
    inFlight.current = true
    try {
      setState({ status: 'connecting' })
      const appKit = await getAppKit()
      appKit.open()
      const connected = await waitForConnection({
        getAccount: () => {
          const acc = getAccount(wagmiConfig)
          return acc.status === 'connected' && acc.address
            ? { address: acc.address as Address, chainId: acc.chainId ?? DEFAULT_CHAIN_ID }
            : null
        },
        subscribeModalOpen: (cb) => appKit.subscribeState((s) => cb(s.open)),
        now: () => Date.now(),
        schedule: (fn, ms) => { setTimeout(fn, ms) },
        timeoutMs: CONNECT_TIMEOUT_MS,
      })
      if (!connected) {
        // Make sure the AppKit sheet isn't left open behind our error state.
        appKit.close()
        setState({ status: 'error', error: 'user_rejected_connect' })
        return
      }
      let { address, chainId } = connected

      if (chainId !== DEFAULT_CHAIN_ID) {
        try {
          await switchChainAsync({ chainId: DEFAULT_CHAIN_ID })
          chainId = DEFAULT_CHAIN_ID
        } catch {
          setState({ status: 'error', error: 'wrong_chain' })
          return
        }
      }

      setState({ status: 'requesting_nonce' })
      let nonceRes: Response
      try {
        nonceRes = await fetch('/api/auth/nonce', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ address }),
        })
      } catch {
        setState({ status: 'error', error: 'network_error' })
        return
      }
      if (!nonceRes.ok) {
        setState({ status: 'error', error: 'nonce_failed' })
        return
      }
      const { nonce } = (await nonceRes.json()) as { nonce: string }

      const message = buildSiweMessage({
        domain: window.location.host,
        address,
        uri: window.location.origin,
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
        statement: 'Sign in to Aura.',
      })

      setState({ status: 'awaiting_signature' })
      let signature: `0x${string}`
      try {
        signature = await signMessageAsync({ message, account: address })
      } catch {
        setState({ status: 'error', error: 'user_rejected_signature' })
        return
      }

      setState({ status: 'verifying' })
      // Best-effort wallet name for the admin list. Injected wallets report a
      // real name (MetaMask, Phantom, …); WalletConnect-relayed ones often just
      // report "WalletConnect". Display-only — the server never trusts it.
      const walletProvider = getAccount(wagmiConfig).connector?.name
      let verifyRes: Response
      try {
        verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ message, signature, walletProvider }),
        })
      } catch {
        setState({ status: 'error', error: 'network_error' })
        return
      }
      if (!verifyRes.ok) {
        setState({ status: 'error', error: 'verify_failed' })
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['session'] })
      setState({ status: 'success', address })
      router.push(redirectTo)
    } finally {
      inFlight.current = false
    }
  }

  function reset(): void {
    setState({ status: 'idle' })
  }

  return { state, start, reset }
}
