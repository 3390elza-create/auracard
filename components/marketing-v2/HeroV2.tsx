import Link from 'next/link'
import { Sparkles, ArrowRight, CircleCheck } from 'lucide-react'
import { HERO } from './content'

export function HeroV2() {
  return (
    <section className="relative border-b border-border/50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.07)_0,transparent_58%)]" />
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="gradient-orb left-[10%] top-20 h-72 w-72 bg-[hsl(var(--primary)/0.12)]" />
      <div className="gradient-orb right-[6%] top-24 h-80 w-80 bg-[hsl(var(--primary-light)/0.14)]" />
      <div className="container-v2 relative grid gap-6 pb-6 pt-6 lg:gap-16 lg:pb-32 lg:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-3xl text-center lg:text-left">
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-5 py-2 text-base font-semibold text-primary shadow-lg shadow-primary/10 backdrop-blur">
            <Sparkles className="h-4 w-4" />{HERO.badge}
          </div>
          <h1 className="animate-fade-in-up-delay-1 mt-4 font-semibold leading-[1.1] tracking-[-0.04em] text-foreground lg:mt-7" style={{ fontSize: 'clamp(2.5rem, 8.5vw, 4.2rem)' }}>
            <span className="whitespace-pre-line">{HERO.titleLines.join('\n')}</span>
            <br /><span className="text-foreground lg:text-primary">{HERO.titleAccent}</span>
          </h1>
          <p className="animate-fade-in-up-delay-2 mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-xl lg:mx-0 lg:mt-8">{HERO.subtitle}</p>
          <div className="animate-fade-in-up-delay-3 mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:mt-10 lg:gap-4 lg:justify-start">
            <Link href={HERO.ctaPrimary.href} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5">
              {HERO.ctaPrimary.label}<ArrowRight className="h-5 w-5" />
            </Link>
            <a href={HERO.ctaSecondary.href} className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-8 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-secondary">{HERO.ctaSecondary.label}</a>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-lg lg:mt-10 lg:gap-x-6 lg:justify-start">
            {HERO.ticks.map((t) => (
              <div key={t} className="flex items-center gap-2"><CircleCheck className="h-5 w-5 text-success" /><span>{t}</span></div>
            ))}
          </div>
        </div>
        <div className="relative mt-8 flex items-center justify-center lg:mt-0">
          <img src="/marketing/hero-wallet.avif" alt="Crypto wallet app" className="w-full max-w-[520px] lg:max-w-none select-none" draggable={false} />
        </div>
      </div>
    </section>
  )
}
