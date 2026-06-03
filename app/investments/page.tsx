import { Lock, ShieldCheck, FileSearch } from 'lucide-react'
import { MarketingShell } from '@/components/layout/MarketingShell'
import { PageHeader } from '@/components/marketing/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'

export const metadata = {
  title: 'Investments — Aura',
  description: 'A managed, non-custodial vault — gated until independently audited.',
}

const principles = [
  {
    title: 'Non-custodial',
    description: 'Funds stay under your control. No operator key can withdraw to an arbitrary address.',
    icon: <ShieldCheck className="h-6 w-6" />,
    tone: 'teal' as const,
  },
  {
    title: 'Whitelisted strategies only',
    description: 'Any managed action is limited to pre-approved, whitelisted swaps — never open-ended access.',
    icon: <Lock className="h-6 w-6" />,
    tone: 'violet' as const,
  },
  {
    title: 'Audit before launch',
    description: 'The vault ships only after an independent security audit. We will publish the report.',
    icon: <FileSearch className="h-6 w-6" />,
    tone: 'blue' as const,
  },
]

export default function InvestmentsPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Coming soon"
        title="Managed, non-custodial vault"
        description="An optional, opt-in way to put idle collateral to work — designed around the same custody guarantees as the rest of Aura. It is not live yet."
      />

      <section className="grid grid-cols-1 gap-8 pb-20 md:grid-cols-3">
        {principles.map(({ title, description, icon, tone }) => (
          <Panel key={title} rounded="xl" className="flex flex-col gap-4 p-stack-lg">
            <IconBadge icon={icon} tone={tone} />
            <h3 className="text-headline-md text-text-primary">{title}</h3>
            <p className="text-body-md text-text-secondary">{description}</p>
          </Panel>
        ))}
      </section>

      <section className="pb-24">
        <Panel rounded="xl" className="mx-auto max-w-2xl p-stack-lg text-center">
          <p className="text-body-md text-text-secondary">
            This feature is gated and under development. Nothing here is an offer or a
            solicitation to invest. We will announce availability once the audit is
            complete.
          </p>
        </Panel>
      </section>
    </MarketingShell>
  )
}
