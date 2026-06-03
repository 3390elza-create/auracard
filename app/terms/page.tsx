import { MarketingShell } from '@/components/layout/MarketingShell'
import { LegalDocument } from '@/components/legal/LegalDocument'

export const metadata = {
  title: 'Terms of Service — Aura',
  description: 'The terms governing your use of the Aura non-custodial crypto-backed card.',
}

export default function TermsPage() {
  return (
    <MarketingShell>
      <div className="py-16 md:py-24">
        <LegalDocument slug="terms-of-service" />
      </div>
    </MarketingShell>
  )
}
