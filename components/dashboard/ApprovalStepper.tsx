import { Clock, Activity, FileCheck, CreditCard } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StepDot } from '@/components/ui/StepDot'
import type { ApprovalProgress, ApprovalStep, StepStatus } from '@/lib/mock/types'

const stepIcons: Record<ApprovalStep['id'], ReactNode> = {
  wallet_connected: <Activity   className="h-5 w-5" />,
  asset_analysis:   <Activity   className="h-5 w-5" />,
  approval:         <FileCheck  className="h-5 w-5" />,
  card_issued:      <CreditCard className="h-5 w-5" />,
}

const captionColor: Record<StepStatus, string> = {
  completed:   'text-aurora-teal',
  in_progress: 'text-aurora-violet',
  pending:     'text-text-secondary',
}

export function ApprovalStepper({ progress }: { progress: ApprovalProgress }) {
  return (
    <Panel rounded="xl" className="relative mb-stack-lg overflow-hidden p-stack-lg">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <h2 className="text-headline-md font-bold text-text-primary">Approval status</h2>
        <div className="flex items-center gap-2 text-text-secondary">
          <Clock className="h-5 w-5" />
          <span className="text-label-md">{progress.etaLabel}</span>
        </div>
      </div>
      <div className="relative mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="absolute left-0 top-6 -z-10 hidden h-px w-full bg-white/10 md:block" />
        {progress.steps.map(step => (
          <div
            key={step.id}
            className={`flex flex-col items-center text-center md:items-start md:text-left ${step.status === 'pending' ? 'opacity-40' : ''}`}
          >
            <div className="mb-4">
              <StepDot status={step.status} icon={stepIcons[step.id]} />
            </div>
            <p
              className={`text-label-md ${step.status === 'pending' ? 'text-text-secondary' : 'text-text-primary'}`}
            >
              {step.label}
            </p>
            <p className={`mt-1 text-label-sm ${captionColor[step.status]}`}>{step.caption}</p>
          </div>
        ))}
      </div>
      <ProgressBar percent={progress.percent} />
    </Panel>
  )
}
