import { MEMBER_COUNT, SUPPORTED_NETWORKS } from '@/lib/content/marketing'

const stats = [
  { value: MEMBER_COUNT, label: 'Elite members' },
  { value: String(SUPPORTED_NETWORKS.length), label: 'Networks supported' },
  { value: '100%', label: 'Non-custodial' },
  { value: '0', label: 'Documents to start' },
]

export function StatsStrip() {
  return (
    <section aria-label="Aura by the numbers" className="py-8">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-glass-border bg-glass-border md:grid-cols-4">
        {stats.map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 bg-surface px-6 py-8 text-center">
            <dt className="text-display-lg text-text-primary md:text-[40px]">{value}</dt>
            <dd className="text-label-md text-text-secondary">{label}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
