import { ArrowRight } from 'lucide-react'
import { MarketingShell } from '@/components/layout/MarketingShell'
import { PageHeader } from '@/components/marketing/PageHeader'
import { SecuritySection } from '@/components/landing/SecuritySection'
import { GradientButton } from '@/components/ui/GradientButton'

export const metadata = {
  title: 'Security — Aura',
  description: 'Non-custodial by design. Read-only access. Your keys, your funds.',
}

export default function SecurityPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Security"
        title="Your keys, your funds"
        description="Aura is built to read your wallet — never to control it. Here is exactly how we keep custody in your hands."
      />
      <SecuritySection />
      <div className="flex justify-center pb-24">
        <GradientButton
          href="/connect"
          size="lg"
          icon={<ArrowRight className="h-5 w-5" />}
          iconPosition="right"
        >
          Connect wallet
        </GradientButton>
      </div>
    </MarketingShell>
  )
}
