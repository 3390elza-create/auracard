import { Star, Plane, Users, Sparkles, ArrowRight, type LucideIcon } from 'lucide-react'
import { PREMIUM } from './content'
import { IssueCardButton } from './issue-flow/IssueCardButton'

type PerkIcon = (typeof PREMIUM.perks)[number]['icon']
const ICONS: Record<PerkIcon, LucideIcon> = { Star, Plane, Users, Sparkles }

export function PremiumCardSection() {
  return (
    <section id="premium" className="relative py-24">
      <div className="container-v2 relative">
        <div className="rounded-[2.5rem] border border-border/60 bg-card/90 px-8 py-14 sm:px-14 lg:px-16 lg:py-16 shadow-lg shadow-foreground/5">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                <Star className="h-3.5 w-3.5 fill-primary" />Exclusive
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">{PREMIUM.heading1}<br />{PREMIUM.heading2}</h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">{PREMIUM.body}</p>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {PREMIUM.perks.map((p) => {
                  const Icon = ICONS[p.icon]
                  return (
                    <div key={p.label} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                      <span className="text-base font-medium text-foreground">{p.label}</span>
                    </div>
                  )
                })}
              </div>
              <IssueCardButton className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-lg font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5 sm:w-auto">
                {PREMIUM.cta.label}<ArrowRight className="h-5 w-5" />
              </IssueCardButton>
            </div>
            <div className="mx-auto w-full max-w-[500px]">
              <img src={PREMIUM.image} alt="AuraCard metal card" className="w-full h-auto rounded-[1.5rem]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
