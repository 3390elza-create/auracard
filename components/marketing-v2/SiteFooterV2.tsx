import Link from 'next/link'
import { Shield, Lock, Globe, CircleCheckBig, type LucideIcon } from 'lucide-react'
import { BRAND, FOOTER } from './content'

const BADGE_ICONS: LucideIcon[] = [Lock, Shield, Globe, CircleCheckBig]

export function SiteFooterV2() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container-v2 py-16">
        <div className="grid gap-12 text-center md:text-left md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <img src={BRAND.logo} alt={BRAND.name} className="h-9 w-auto" />
              <span className="text-xl font-bold text-foreground">{BRAND.name}</span>
            </div>
            <p className="mt-5 mx-auto md:mx-0 max-w-xs text-base leading-relaxed text-muted-foreground">{FOOTER.tagline}</p>
          </div>
          {FOOTER.columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-base font-semibold text-foreground">{col.title}</h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-base text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/50">
        <div className="container-v2 flex flex-wrap items-center justify-center gap-4 py-8">
          {FOOTER.compliance.map((c, i) => {
            const Icon = BADGE_ICONS[i % BADGE_ICONS.length]
            return (
              <div key={c} className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-5 py-2.5 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{c}</div>
            )
          })}
        </div>
      </div>
      <div className="border-t border-border/50">
        <div className="container-v2 py-8 text-center">
          <p className="text-sm text-muted-foreground">{FOOTER.copyright}</p>
          <p className="mx-auto mt-4 max-w-4xl text-xs leading-relaxed text-muted-foreground/70">{FOOTER.disclaimer}</p>
        </div>
      </div>
    </footer>
  )
}
