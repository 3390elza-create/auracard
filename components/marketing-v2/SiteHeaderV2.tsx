import Link from 'next/link'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { BRAND, NAV } from './content'
import { IssueCardButton } from './issue-flow/IssueCardButton'

export function SiteHeaderV2() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-xl">
      <div className="container-v2 flex h-20 items-center justify-between relative">
        <Link href="#top" className="flex shrink-0 items-center gap-2" aria-label={`${BRAND.name} homepage`}>
          <img src={BRAND.logo} alt={BRAND.name} className="h-8 w-auto md:h-10" />
          <span className="text-xl font-bold tracking-tight text-foreground">{BRAND.name}</span>
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 text-base text-muted-foreground lg:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="transition-colors hover:text-foreground">{n.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <button type="button" className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary" aria-label="Language">
            <span className="text-base">🇬🇧</span>
            <span className="hidden sm:inline">English</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <IssueCardButton className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
            Get Started<ArrowRight className="h-4 w-4" />
          </IssueCardButton>
        </div>
      </div>
    </header>
  )
}
