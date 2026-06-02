import { Star } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GradientButton } from '@/components/ui/GradientButton'

export function ClosingCTA() {
  return (
    <section className="py-20">
      <Panel rounded="xl" className="relative overflow-hidden p-12 text-center md:p-20">
        <div className="absolute right-0 top-0 h-64 w-64 bg-aurora-violet/20 blur-[80px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 bg-aurora-teal/20 blur-[80px]" />
        <div className="relative z-10 space-y-8">
          <h2 className="text-headline-lg text-text-primary">
            Ready to raise your financial standard?
          </h2>
          <p className="mx-auto max-w-xl text-body-lg text-text-secondary">
            Join elite investors already benefiting from Aura around the world.
          </p>
          <GradientButton
            href="/connect"
            size="xl"
            icon={<Star className="h-5 w-5" />}
            iconPosition="right"
          >
            Request my Aura Card
          </GradientButton>
        </div>
      </Panel>
    </section>
  )
}
