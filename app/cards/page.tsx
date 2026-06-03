import { ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react'
import { MarketingShell } from '@/components/layout/MarketingShell'
import { PageHeader } from '@/components/marketing/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'
import { GradientButton } from '@/components/ui/GradientButton'
import { CardVisualizer } from '@/components/card/CardVisualizer'
import { LTV, SUPPORTED_NETWORKS, COLLATERAL_TOKENS } from '@/lib/content/marketing'

export const metadata = {
  title: 'The Aura Card — Aura',
  description: 'A luxury credit card backed by your crypto. No KYC to check your limit.',
}

const features = [
  {
    title: 'No KYC to start',
    description: 'Check your eligibility and limit with zero documents — read-only, no credit check.',
    icon: <ShieldCheck className="h-6 w-6" />,
    tone: 'teal' as const,
  },
  {
    title: 'Instant assessment',
    description: 'We score your on-chain liquidity in seconds. No bank, no waiting.',
    icon: <Zap className="h-6 w-6" />,
    tone: 'violet' as const,
  },
  {
    title: 'Multi-chain collateral',
    description: `Bring assets across ${SUPPORTED_NETWORKS.length} networks without selling or bridging.`,
    icon: <Globe className="h-6 w-6" />,
    tone: 'blue' as const,
  },
]

export default function CardsPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="The Card"
        title="A credit card backed by your crypto"
        description={LTV.headline}
      />

      <section className="grid grid-cols-1 items-center gap-16 pb-20 lg:grid-cols-2">
        <CardVisualizer />
        <div className="space-y-6">
          <h2 className="text-headline-md text-text-primary">Keep your upside, unlock spending power</h2>
          <p className="text-body-lg text-text-secondary">
            Use {COLLATERAL_TOKENS.join(', ')} as collateral on {SUPPORTED_NETWORKS.join(', ')}.
            Your assets stay yours — you spend against them instead of selling them.
          </p>
          <GradientButton
            href="/connect"
            size="lg"
            icon={<ArrowRight className="h-5 w-5" />}
            iconPosition="right"
          >
            Connect wallet
          </GradientButton>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 pb-24 md:grid-cols-3">
        {features.map(({ title, description, icon, tone }) => (
          <Panel key={title} rounded="xl" className="flex flex-col gap-4 p-stack-lg">
            <IconBadge icon={icon} tone={tone} />
            <h3 className="text-headline-md text-text-primary">{title}</h3>
            <p className="text-body-md text-text-secondary">{description}</p>
          </Panel>
        ))}
      </section>
    </MarketingShell>
  )
}
