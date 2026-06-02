interface ProgressRingProps {
  percent: number
  label: string
  caption: string
  size?: number
  strokeWidth?: number
}

export function ProgressRing({
  percent,
  label,
  caption,
  size = 192,
  strokeWidth = 8,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
        />
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent"
          stroke="#2DD4BF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-headline-md font-bold text-text-primary">{label}</span>
        <span className="text-label-sm text-text-secondary">{caption}</span>
      </div>
    </div>
  )
}
