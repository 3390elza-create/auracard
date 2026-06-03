import { FaqList } from '@/components/marketing/FaqList'

export function FaqSection() {
  return (
    <section id="faq" className="py-20 md:py-32">
      <div className="mb-16 space-y-4 text-center">
        <h2 className="text-headline-lg text-text-primary">Frequently asked questions</h2>
        <p className="mx-auto max-w-2xl text-body-lg text-text-secondary">
          The honest answers — custody, KYC, networks and limits.
        </p>
      </div>
      <FaqList />
    </section>
  )
}
