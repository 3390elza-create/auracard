import { PARTNERS, PARTNERS_HEADING } from './content'

export function BackersStrip() {
  return (
    <section className="border-b border-border/50 py-20">
      <div className="container-v2">
        <p className="text-center text-xl text-muted-foreground">{PARTNERS_HEADING}</p>
        <div className="mt-10 grid grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {PARTNERS.map((p) => (
            <div key={p} className="flex items-center justify-center rounded-2xl border border-border/50 bg-card/60 px-6 py-6 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">{p}</div>
          ))}
        </div>
      </div>
    </section>
  )
}
