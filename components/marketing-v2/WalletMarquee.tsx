import { WALLETS } from './content'

export function WalletMarquee() {
  const loop = [...WALLETS, ...WALLETS, ...WALLETS]
  return (
    <section className="border-b border-border/50 py-8">
      <div className="container-v2 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <img src="/marketing/wallets/apple-pay.svg" alt="Apple Pay" className="h-12 w-auto opacity-80" loading="lazy" />
          <img src="/marketing/wallets/google-pay.svg" alt="Google Pay" className="h-12 w-auto opacity-80" loading="lazy" />
        </div>
        <p className="text-center text-lg text-muted-foreground">Works with your favorite wallets</p>
      </div>
      <div className="mt-8 overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-16 px-8">
          {loop.map((w, i) => (
            <img key={`${w.name}-${i}`} src={w.src} alt={w.name} className="h-10 w-auto shrink-0 opacity-45 grayscale transition-opacity duration-300 hover:opacity-80" />
          ))}
        </div>
      </div>
    </section>
  )
}
