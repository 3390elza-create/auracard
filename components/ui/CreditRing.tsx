import { formatUSD } from '@/lib/format'

interface CreditRingProps {
  potentialUsd: number
  readyUsd: number
  fillPercent: number
  size?: number
  strokeWidth?: number
}

// Two-layer ring: a dim violet track = the 80%-of-everything *potential* target,
// filled with a teal arc = the 80%-of-USDC *ready* credit. The fill grows as the
// user converts holdings into USDC.
export function CreditRing({
  potentialUsd,
  readyUsd,
  fillPercent,
  size = 192,
  strokeWidth = 9,
}: CreditRingProps) {
  const clamped = Math.max(0, Math.min(100, fillPercent))
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const fillOffset = circumference * (1 - clamped / 100)

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={`Ready credit ${formatUSD(readyUsd)} of potential ${formatUSD(potentialUsd)}`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
        />
        {/* potential target track */}
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent" stroke="rgba(124,92,255,0.30)" strokeWidth={strokeWidth}
        />
        {/* ready fill */}
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent"
          stroke="#2DD4BF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={fillOffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-label-sm uppercase tracking-wider text-text-secondary">Potential</span>
        <span className="text-headline-md font-bold text-aurora-violet">{formatUSD(potentialUsd)}</span>
        <span className="text-label-sm text-text-secondary">Ready {formatUSD(readyUsd)}</span>
      </div>
    </div>
  )
}
