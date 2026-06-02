import type { ReactNode } from 'react'

type Tone = 'violet' | 'teal' | 'blue' | 'orange'
type Size = 'sm' | 'md' | 'lg'

interface IconBadgeProps {
  icon: ReactNode
  tone?: Tone
  size?: Size
  className?: string
}

const toneClasses: Record<Tone, string> = {
  violet: 'bg-aurora-violet/20 text-aurora-violet',
  teal:   'bg-aurora-teal/20   text-aurora-teal',
  blue:   'bg-aurora-blue/20   text-aurora-blue',
  orange: 'bg-orange-500/20    text-orange-500',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8  w-8  rounded-full',
  md: 'h-10 w-10 rounded-md',
  lg: 'h-12 w-12 rounded-xl',
}

export function IconBadge({ icon, tone = 'violet', size = 'lg', className = '' }: IconBadgeProps) {
  return (
    <div
      className={`flex items-center justify-center ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
    </div>
  )
}
