import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { StepStatus } from '@/lib/dashboard/types'

interface StepDotProps {
  status: StepStatus
  icon: ReactNode        // shown when status is in_progress or pending
}

export function StepDot({ status, icon }: StepDotProps) {
  if (status === 'completed') {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-aurora-gradient shadow-glow-violet">
        <Check className="h-6 w-6 text-white" strokeWidth={2.5} />
      </div>
    )
  }
  if (status === 'in_progress') {
    return (
      <div className="pulse-accent flex h-12 w-12 items-center justify-center rounded-full border-2 border-aurora-violet bg-aurora-violet/20 text-aurora-violet">
        {icon}
      </div>
    )
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-text-secondary">
      {icon}
    </div>
  )
}
