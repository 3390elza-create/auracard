import { BrandingAnchor } from '@/components/layout/BrandingAnchor'
import { WalletPicker } from '@/components/connect/WalletPicker'

export const metadata = {
  title: 'Connect your wallet — Aura',
}

export default function ConnectPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-gutter">
      <WalletPicker />
      <BrandingAnchor />
    </main>
  )
}
