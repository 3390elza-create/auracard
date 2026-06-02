import { ArrowRight } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { GhostButton } from '@/components/ui/GhostButton'
import { CardVisualizer } from '@/components/card/CardVisualizer'

export function Hero() {
  return (
    <section className="grid grid-cols-1 items-center gap-16 py-20 md:py-32 lg:grid-cols-2">
      <div className="space-y-stack-lg">
        <h1 className="max-w-xl text-headline-lg text-text-primary md:text-[40px]">
          Your on-chain wealth, now in the real world
        </h1>
        <p className="max-w-lg text-body-lg text-text-secondary">
          The first luxury credit card backed by your crypto. No bureaucracy,
          instant approval.
        </p>
        <div className="flex flex-col gap-stack-md pt-4 sm:flex-row">
          <GradientButton
            href="/connect"
            size="lg"
            icon={<ArrowRight className="h-5 w-5" />}
            iconPosition="right"
          >
            Connect wallet
          </GradientButton>
          <GhostButton href="#benefits" size="lg">
            View benefits
          </GhostButton>
        </div>
      </div>
      <CardVisualizer />
    </section>
  )
}
