import { BrandingAnchor } from '@/components/layout/BrandingAnchor'
import { WalletPicker } from '@/components/connect/WalletPicker'

export const metadata = {
  title: 'Connect your wallet — Aura',
}

interface ConnectPageProps {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function ConnectPage({ searchParams }: ConnectPageProps) {
  const { redirectTo } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center p-gutter">
      <WalletPicker redirectTo={redirectTo ?? '/dashboard'} />
      <BrandingAnchor />
    </main>
  )
}
