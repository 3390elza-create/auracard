'use client'

import { createAppKit } from '@reown/appkit'
import { mainnet } from '@reown/appkit/networks'
import { wagmiAdapter } from './wagmi'
import { readPublicEnv } from './env'

let modal: ReturnType<typeof createAppKit> | undefined

export function getAppKit() {
  if (modal) return modal
  const { wcProjectId } = readPublicEnv()
  modal = createAppKit({
    adapters: [wagmiAdapter],
    networks: [mainnet],
    projectId: wcProjectId,
    metadata: {
      name: 'Aura',
      description: 'Your on-chain wealth, now in the real world.',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://aura.local',
      icons: ['/logo.svg'],
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
  return modal
}
