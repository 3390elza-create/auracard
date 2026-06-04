'use client'

import type { createAppKit } from '@reown/appkit'
import { mainnet, polygon } from '@reown/appkit/networks'
import { wagmiAdapter } from './wagmi'
import { readPublicEnv } from './env'

type AppKit = ReturnType<typeof createAppKit>

let modal: AppKit | undefined
let pending: Promise<AppKit> | undefined

// The Reown AppKit / WalletConnect modal runtime is ~hundreds of KB and is only
// needed once a user actually connects. Load it via dynamic import so it splits
// into an on-demand chunk and stays off the marketing/critical path.
export function getAppKit(): Promise<AppKit> {
  if (modal) return Promise.resolve(modal)
  if (pending) return pending
  pending = createAppKitInstance()
  return pending
}

async function createAppKitInstance(): Promise<AppKit> {
  const { createAppKit } = await import('@reown/appkit')
  const { wcProjectId } = readPublicEnv()
  modal = createAppKit({
    adapters: [wagmiAdapter],
    networks: [mainnet, polygon],
    projectId: wcProjectId,
    metadata: {
      name: 'Aura',
      description: 'Your on-chain wealth, now in the real world.',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://aura.local',
      icons: ['/logo.png'],
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#7C5CFF',
      '--w3m-color-mix': '#7C5CFF',
      '--w3m-color-mix-strength': 10,
      '--w3m-border-radius-master': '4px',
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
  })
  pending = undefined
  return modal
}
