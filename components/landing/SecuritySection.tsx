import { Eye, KeyRound, PenLine } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { IconBadge } from '@/components/ui/IconBadge'

const guarantees = [
  {
    title: 'Read-only access',
    description:
      'We only read your balances. Assessing your card never requires a transaction or a token approval.',
    icon: <Eye className="h-6 w-6" />,
    tone: 'blue' as const,
  },
  {
    title: 'Non-custodial by design',
    description:
      'No operator key can ever move your funds. Withdrawal is your exclusive right — always.',
    icon: <KeyRound className="h-6 w-6" />,
    tone: 'teal' as const,
  },
  {
    title: 'Sign in, never spend',
    description:
      'You sign a plain login message with a one-time nonce — never a blank cheque, never an open-ended allowance.',
    icon: <PenLine className="h-6 w-6" />,
    tone: 'violet' as const,
  },
]

export function SecuritySection() {
  return (
    <section id="security" className="py-20 md:py-32">
      <div className="mb-16 space-y-4 text-center">
        <h2 className="text-headline-lg text-text-primary">Your keys, your funds</h2>
        <p className="mx-auto max-w-2xl text-body-lg text-text-secondary">
          Aura is non-custodial. We read your wallet to assess your card — we can
          never touch what&apos;s inside it.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {guarantees.map(({ title, description, icon, tone }) => (
          <Panel key={title} rounded="xl" className="flex flex-col gap-4 p-stack-lg">
            <IconBadge icon={icon} tone={tone} />
            <h3 className="text-headline-md text-text-primary">{title}</h3>
            <p className="text-body-md text-text-secondary">{description}</p>
          </Panel>
        ))}
      </div>
    </section>
  )
}
