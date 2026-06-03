import { MarketingShell } from '@/components/layout/MarketingShell'
import { FaqList } from '@/components/marketing/FaqList'

export const metadata = {
  title: 'FAQ — Aura',
  description: 'Honest answers about custody, KYC, supported networks and limits.',
}

export default function FaqPage() {
  return (
    <MarketingShell>
      <section className="py-16 md:py-24">
        <div className="mb-16 space-y-4 text-center">
          <h1 className="text-headline-lg text-text-primary">Frequently asked questions</h1>
          <p className="mx-auto max-w-2xl text-body-lg text-text-secondary">
            Everything about custody, KYC, supported assets and how your limit works.
          </p>
        </div>
        <FaqList />
      </section>
    </MarketingShell>
  )
}
