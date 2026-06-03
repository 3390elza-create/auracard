import { Wallet, Globe, Smartphone, ShieldCheck, Zap, BadgeDollarSign, type LucideIcon } from 'lucide-react'
import { FEATURES } from './content'

type FeatureIcon = (typeof FEATURES)[number]['icon']
const ICONS: Record<FeatureIcon, LucideIcon> = { Wallet, Globe, Smartphone, ShieldCheck, Zap, BadgeDollarSign }

export function FeaturesGrid() {
  return (
    <section id="features" className="border-b border-border/50 py-24">
      <div className="container-v2">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-lg font-semibold text-primary">Features</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">Everything you need. Nothing you don&apos;t.</h2>
          <p className="mt-5 text-xl leading-relaxed text-muted-foreground">Built for the modern crypto user. Every feature designed to make your life easier.</p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon]
            return (
              <article key={f.title} className="rounded-[2rem] border border-border/60 bg-card/80 p-8 shadow-xl shadow-foreground/5 backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary"><Icon className="h-7 w-7" /></div>
                <h3 className="mt-6 text-2xl font-bold tracking-tight text-foreground">{f.title}</h3>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
