import { MarketingShell } from '@/components/layout/MarketingShell'
import { LegalDocument } from '@/components/legal/LegalDocument'

export const metadata = {
  title: 'Privacy Policy — Aura',
  description: 'What data Aura does and does not collect. No KYC, no private keys, ever.',
}

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <div className="py-16 md:py-24">
        <LegalDocument slug="privacy-policy" />
      </div>
    </MarketingShell>
  )
}
