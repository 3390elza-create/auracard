import { Web3Providers } from '@/lib/web3/providers'

// The connect screen drives wallet selection + SIWE, so the wagmi provider tree
// loads with this route (not at the app root).
export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return <Web3Providers>{children}</Web3Providers>
}
