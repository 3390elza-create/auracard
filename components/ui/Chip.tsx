import type { ReactNode } from 'react'

type Tone = 'violet' | 'teal' | 'blue' | 'neutral'

interface ChipProps {
  children: ReactNode
  tone?: Tone
  className?: string
}

const toneClasses: Record<Tone, string> = {
  violet:  'bg-aurora-violet/15 text-aurora-violet',
  teal:    'bg-aurora-teal/15   text-aurora-teal',
  blue:    'bg-aurora-blue/15   text-aurora-blue',
  neutral: 'bg-white/10         text-text-secondary',
}

export function Chip({ children, tone = 'neutral', className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-semibold uppercase tracking-wider ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
