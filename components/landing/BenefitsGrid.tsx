import { Landmark, ShieldCheck, ScrollText } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'

const benefits = [
  {
    title: 'No bank',
    description: 'Complete independence from traditional financial institutions and excessive bureaucracy.',
    icon: <Landmark className="h-6 w-6" />,
    tone: 'violet' as const,
  },
  {
    title: 'Crypto-backed',
    description: 'Use your assets as collateral without selling them — keep your upside.',
    icon: <ShieldCheck className="h-6 w-6" />,
    tone: 'teal' as const,
  },
  {
    title: 'On-chain approval',
    description: 'Eligibility based entirely on your wallet history and digital liquidity.',
    icon: <ScrollText className="h-6 w-6" />,
    tone: 'blue' as const,
  },
]

export function BenefitsGrid() {
  return (
    <section id="benefits" className="grid grid-cols-1 gap-8 py-20 md:grid-cols-3">
      {benefits.map(({ title, description, icon, tone }) => (
        <Panel key={title} rounded="xl" className="flex flex-col gap-4 p-stack-lg">
          <IconBadge icon={icon} tone={tone} />
          <h3 className="text-headline-md text-text-primary">{title}</h3>
          <p className="text-body-md text-text-secondary">{description}</p>
        </Panel>
      ))}
    </section>
  )
}
