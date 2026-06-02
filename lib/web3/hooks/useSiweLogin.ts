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

function waitForConnection(timeoutMs: number): Promise<{ address: Address; chainId: number } | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      const acc = getAccount(wagmiConfig)
      if (acc.status === 'connected' && acc.address) {
        resolve({ address: acc.address as Address, chainId: acc.chainId ?? DEFAULT_CHAIN_ID })
        return
      }
      if (Date.now() - start > timeoutMs) {
        resolve(null)
        return
      }
      setTimeout(tick, 200)
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
      getAppKit().open()
      const connected = await waitForConnection(CONNECT_TIMEOUT_MS)
      if (!connected) {
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
      let verifyRes: Response
      try {
        verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ message, signature }),
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
