import Link from 'next/link'
import { HelpCircle, ShieldCheck, Mail } from 'lucide-react'
import { MarketingShell } from '@/components/layout/MarketingShell'
import { PageHeader } from '@/components/marketing/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'
import { SUPPORT_EMAIL } from '@/lib/content/marketing'

export const metadata = {
  title: 'Support — Aura',
  description: 'Get help with Aura — FAQ, security and how to reach the team.',
}

export default function SupportPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Support"
        title="How can we help?"
        description="Start with the answers below, or reach the team directly."
      />

      <section className="grid grid-cols-1 gap-8 pb-12 md:grid-cols-3">
        <Link href="/faq" className="block">
          <Panel rounded="xl" className="flex h-full flex-col gap-4 p-stack-lg transition-colors hover:bg-white/10">
            <IconBadge icon={<HelpCircle className="h-6 w-6" />} tone="violet" />
            <h3 className="text-headline-md text-text-primary">FAQ</h3>
            <p className="text-body-md text-text-secondary">
              Custody, KYC, supported networks and how your limit works.
            </p>
          </Panel>
        </Link>

        <Link href="/security" className="block">
          <Panel rounded="xl" className="flex h-full flex-col gap-4 p-stack-lg transition-colors hover:bg-white/10">
            <IconBadge icon={<ShieldCheck className="h-6 w-6" />} tone="teal" />
            <h3 className="text-headline-md text-text-primary">Security</h3>
            <p className="text-body-md text-text-secondary">
              How non-custodial access and read-only assessment keep your funds yours.
            </p>
          </Panel>
        </Link>

        <a href={`mailto:${SUPPORT_EMAIL}`} className="block">
          <Panel rounded="xl" className="flex h-full flex-col gap-4 p-stack-lg transition-colors hover:bg-white/10">
            <IconBadge icon={<Mail className="h-6 w-6" />} tone="blue" />
            <h3 className="text-headline-md text-text-primary">Email us</h3>
            <p className="text-body-md text-text-secondary">{SUPPORT_EMAIL}</p>
          </Panel>
        </a>
      </section>

      <section className="pb-24">
        <Panel rounded="xl" className="mx-auto max-w-2xl p-stack-lg text-center">
          <p className="text-body-md text-text-secondary">
            Aura will never ask for your private key or seed phrase. Any message
            requesting them is fraudulent — do not respond.
          </p>
        </Panel>
      </section>
    </MarketingShell>
  )
}
