'use client'

import Image from 'next/image'
import { ChevronRight, Loader2, Lock } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'
import { useSiweLogin, type WalletId } from '@/lib/web3/hooks/useSiweLogin'
import type { SiweLoginError, SiweLoginState } from '@/lib/web3/types'

interface WalletOptionConfig {
  id: WalletId
  name: string
  iconSrc: string
  highlighted?: boolean
}

const wallets: WalletOptionConfig[] = [
  { id: 'walletconnect', name: 'WalletConnect',  iconSrc: '/wallets/walletconnect.svg', highlighted: true },
  { id: 'metamask',      name: 'MetaMask',       iconSrc: '/wallets/metamask.svg' },
  { id: 'coinbase',      name: 'Coinbase Wallet',iconSrc: '/wallets/coinbase.svg' },
  { id: 'rainbow',       name: 'Rainbow',        iconSrc: '/wallets/rainbow.svg' },
]

const errorCopy: Record<SiweLoginError, string> = {
  user_rejected_connect:   "Connection cancelled. Try again when you're ready.",
  user_rejected_signature: "Sign-in cancelled. We need the signature to log you in.",
  wrong_chain:             'Switch to Ethereum mainnet and try again.',
  nonce_failed:            'Could not start sign-in. Try again.',
  verify_failed:           'Sign-in failed. Try again.',
  network_error:           'Network error. Check your connection and try again.',
}

const inFlightCopy: Partial<Record<SiweLoginState['status'], string>> = {
  connecting:         'Connecting…',
  requesting_nonce:   'Preparing sign-in…',
  awaiting_signature: 'Sign in your wallet…',
  verifying:          'Verifying…',
}

interface WalletPickerProps {
  redirectTo?: string
}

export function WalletPicker({ redirectTo = '/dashboard' }: WalletPickerProps) {
  const { state, start } = useSiweLogin()
  const busy = state.status === 'connecting'
    || state.status === 'requesting_nonce'
    || state.status === 'awaiting_signature'
    || state.status === 'verifying'

  return (
    <Panel rounded="xl" className="w-full max-w-[480px] overflow-hidden">
      <div className="flex flex-col gap-stack-md p-stack-lg">
        <div className="text-center">
          <h1 className="mb-1 text-headline-md text-text-primary">Connect your wallet</h1>
          <p className="text-body-md text-text-secondary">Choose how to connect to Aura.</p>
        </div>
        <div className="mt-stack-md flex flex-col gap-stack-sm">
          {wallets.map(wallet => (
            <WalletOption
              key={wallet.id}
              wallet={wallet}
              busy={busy}
              onClick={() => { void start(wallet.id, redirectTo) }}
            />
          ))}
        </div>
        {busy && inFlightCopy[state.status] && (
          <p className="text-center text-label-sm text-aurora-violet" role="status">
            {inFlightCopy[state.status]}
          </p>
        )}
        {state.status === 'error' && (
          <p className="text-center text-label-sm text-red-400" role="alert">
            {errorCopy[state.error]}
          </p>
        )}
        <div className="mt-stack-lg flex items-center justify-center gap-2 border-t border-glass-border pt-stack-md">
          <Lock className="h-4 w-4 text-aurora-teal" />
          <p className="text-label-sm text-text-secondary">
            Secure connection. We never ask for your private key.
          </p>
        </div>
      </div>
    </Panel>
  )
}

interface WalletOptionProps {
  wallet: WalletOptionConfig
  busy: boolean
  onClick: () => void
}

function WalletOption({ wallet, busy, onClick }: WalletOptionProps) {
  const base = 'group flex w-full items-center justify-between rounded-lg p-4 transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
  const highlightStyles = wallet.highlighted
    ? 'border border-aurora-violet/30 bg-aurora-violet/10 hover:bg-aurora-violet/20'
    : 'border border-transparent bg-white/5 hover:border-glass-border hover:bg-white/10'

  return (
    <button type="button" onClick={onClick} disabled={busy} className={`${base} ${highlightStyles}`}>
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
          <Image src={wallet.iconSrc} alt="" width={24} height={24} aria-hidden />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span className="text-label-md text-text-primary">{wallet.name}</span>
          {wallet.highlighted && <Chip tone="teal">Recommended</Chip>}
        </div>
      </div>
      {busy
        ? <Loader2 className="h-5 w-5 animate-spin text-aurora-violet" />
        : <ChevronRight className="h-5 w-5 text-text-secondary transition-transform group-hover:translate-x-1" />}
    </button>
  )
}
