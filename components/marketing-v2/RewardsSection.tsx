import { Sparkles } from 'lucide-react'
import { REWARDS } from './content'

export function RewardsSection() {
  return (
    <section id="rewards" className="border-b border-border/50 bg-secondary/40 py-24">
      <div className="container-v2 grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />Rewards
          </div>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">{REWARDS.heading}</h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">{REWARDS.body}</p>
          <div className="mt-10 space-y-6">
            {REWARDS.tiers.map((t) => (
              <div key={t.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl font-semibold text-primary">{t.pct}</span>
                  <span className="text-base text-muted-foreground">{t.label}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary" style={{ width: t.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="grid w-full max-w-md grid-cols-2 gap-5">
            {REWARDS.chains.map((c) => (
              <div key={c.name} className="rounded-[1.75rem] border border-border/60 bg-card/90 p-6 shadow-lg shadow-foreground/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.tint}1a` }}>
                  <img src={c.src} alt={c.name} className="h-7 w-7" />
                </div>
                <div className="mt-3 text-lg font-bold text-foreground">{c.name}</div>
                <div className="text-sm text-muted-foreground">{c.back}</div>
              </div>
            ))}
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-button-v2 ring-4 ring-primary/20">
                <Sparkles className="mb-0.5 h-3.5 w-3.5" />
                <span className="text-lg font-semibold leading-none">5%</span>
                <span className="text-[0.5rem] font-bold uppercase tracking-[0.2em]">Max</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
