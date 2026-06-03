import { ArrowRight } from 'lucide-react'
import { CLOSING } from './content'
import { IssueCardButton } from './issue-flow/IssueCardButton'

export function ClosingCtaV2() {
  return (
    <section id="cta" className="border-t border-border/50 bg-card/50 py-24">
      <div className="container-v2">
        <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-border/60 bg-background/90 px-8 py-14 text-center shadow-2xl shadow-foreground/5 backdrop-blur sm:px-14">
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">{CLOSING.heading}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-xl leading-relaxed text-muted-foreground">{CLOSING.body}</p>
          <IssueCardButton className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-button-v2 transition-transform hover:-translate-y-0.5">
            {CLOSING.cta.label}<ArrowRight className="h-5 w-5" />
          </IssueCardButton>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-base text-muted-foreground">
            {CLOSING.chips.map((c) => (
              <div key={c} className="rounded-full border border-border/60 bg-card px-5 py-2.5">{c}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
