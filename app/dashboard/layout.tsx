import { Web3Providers } from '@/lib/web3/providers'

// The dashboard reads on-chain balances/positions, so the wagmi provider tree
// loads with this route. Kept out of the root layout so the marketing page
// doesn't ship the web3 bundle.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Web3Providers>{children}</Web3Providers>
}
