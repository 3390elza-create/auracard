'use client'

import Image from 'next/image'
import { ChevronRight, Lock } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'

type WalletId = 'walletconnect' | 'metamask' | 'coinbase' | 'rainbow'

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

function WalletOption({ wallet }: { wallet: WalletOptionConfig }) {
  function onClick() {
    // Sprint 1: no real connection. Sprint 2 wires Reown AppKit here.
    console.info('mock connect:', wallet.id)
  }

  const base = 'group flex w-full items-center justify-between rounded-lg p-4 transition-all duration-300 active:scale-[0.98]'
  const highlightStyles = wallet.highlighted
    ? 'border border-aurora-violet/30 bg-aurora-violet/10 hover:bg-aurora-violet/20'
    : 'border border-transparent bg-white/5 hover:border-glass-border hover:bg-white/10'

  return (
    <button type="button" onClick={onClick} className={`${base} ${highlightStyles}`}>
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
          <Image src={wallet.iconSrc} alt="" width={24} height={24} aria-hidden />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span className="text-label-md text-text-primary">{wallet.name}</span>
          {wallet.highlighted && <Chip tone="teal">Recommended</Chip>}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-text-secondary transition-transform group-hover:translate-x-1" />
    </button>
  )
}

export function WalletPicker() {
  return (
    <Panel rounded="xl" className="w-full max-w-[480px] overflow-hidden">
      <div className="flex flex-col gap-stack-md p-stack-lg">
        <div className="text-center">
          <h1 className="mb-1 text-headline-md text-text-primary">Connect your wallet</h1>
          <p className="text-body-md text-text-secondary">Choose how to connect to Aura.</p>
        </div>
        <div className="mt-stack-md flex flex-col gap-stack-sm">
          {wallets.map(wallet => <WalletOption key={wallet.id} wallet={wallet} />)}
        </div>
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
