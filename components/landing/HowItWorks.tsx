const steps = [
  { number: 1, title: 'Connect your wallet',     description: 'MetaMask, WalletConnect, or Ledger — fully secure.' },
  { number: 2, title: 'We analyze your assets',  description: 'Our protocol scores your on-chain liquidity in seconds.' },
  { number: 3, title: 'Receive your card',       description: 'Instant digital access and VIP physical delivery.' },
]

export function HowItWorks() {
  return (
    <section className="py-20 md:py-32">
      <div className="mb-16 space-y-4 text-center">
        <h2 className="text-headline-lg text-text-primary">How it works</h2>
        <p className="mx-auto max-w-2xl text-body-lg text-text-secondary">
          Your path to digital luxury in three simple, secure steps.
        </p>
      </div>
      <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="absolute left-[10%] right-[10%] top-1/4 hidden h-px bg-glass-border md:block" />
        {steps.map(({ number, title, description }) => (
          <div key={number} className="relative flex flex-col items-center gap-6 text-center">
            <div className="z-10 flex h-16 w-16 items-center justify-center rounded-full border border-glass-border bg-glass-fill backdrop-blur-glass">
              <span className="text-aurora text-headline-md font-bold">{number}</span>
            </div>
            <div className="space-y-2">
              <h4 className="text-headline-md text-text-primary">{title}</h4>
              <p className="text-body-md text-text-secondary">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
