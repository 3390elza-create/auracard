import { Panel } from '@/components/ui/Panel'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Chip } from '@/components/ui/Chip'
import { formatCompactUSD } from '@/lib/format'
import type { EstimatedLimit } from '@/lib/dashboard/types'

export function EstimatedLimitPanel({ limit }: { limit: EstimatedLimit }) {
  return (
    <Panel rounded="xl" className="flex flex-col items-center justify-center p-stack-lg text-center">
      <h3 className="mb-6 self-start text-label-md uppercase tracking-widest text-text-secondary">
        Estimated limit
      </h3>
      <div className="mb-6">
        <ProgressRing
          percent={limit.utilizationPercent}
          label={formatCompactUSD(limit.limitUsd)}
          caption="Available"
        />
      </div>
      <Chip tone="teal">
        <span className="h-2 w-2 rounded-full bg-aurora-teal" />
        {limit.utilizationCaption}
      </Chip>
    </Panel>
  )
}
