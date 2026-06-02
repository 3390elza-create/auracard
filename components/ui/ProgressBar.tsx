interface ProgressBarProps {
  percent: number
  className?: string
}

export function ProgressBar({ percent, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
    >
      <div
        className="h-full bg-aurora-gradient transition-all duration-1000"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
