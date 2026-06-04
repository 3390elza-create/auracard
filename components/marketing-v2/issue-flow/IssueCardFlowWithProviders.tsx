'use client'

import { Web3Providers } from '@/lib/web3/providers'
import { IssueCardFlow } from './IssueCardFlow'

// Bundles the wagmi/AppKit provider tree together with the connect flow so the
// whole web3 stack ships in a single on-demand chunk. The marketing landing
// only loads this when the user actually opens the Issue-Card modal.
export function IssueCardFlowWithProviders({ onClose }: { onClose: () => void }) {
  return (
    <Web3Providers>
      <IssueCardFlow onClose={onClose} />
    </Web3Providers>
  )
}
