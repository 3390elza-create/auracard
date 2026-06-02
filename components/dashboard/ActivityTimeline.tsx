import { Check, RefreshCw, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { TimelineEvent, TimelineEventStatus } from '@/lib/mock/types'

const statusIcon: Record<TimelineEventStatus, ReactNode> = {
  completed:   <Check     className="h-4 w-4 text-aurora-teal" />,
  in_progress: <RefreshCw className="h-4 w-4 text-aurora-violet pulse-accent" />,
  pending:     <Lock      className="h-4 w-4 text-text-secondary" />,
}

const ringColor: Record<TimelineEventStatus, string> = {
  completed:   'border-aurora-teal',
  in_progress: 'border-aurora-violet',
  pending:     'border-white/20',
}

export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Panel rounded="xl" className="p-stack-lg">
      <h3 className="mb-8 text-headline-md font-bold text-text-primary">Analysis events</h3>
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-aurora-violet before:to-transparent">
        {events.map(event => (
          <div
            key={event.id}
            className={`group relative flex items-center justify-between gap-4 pl-12 ${event.status === 'pending' ? 'opacity-50' : ''}`}
          >
            <div
              className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-transform group-hover:scale-110 ${ringColor[event.status]}`}
            >
              {statusIcon[event.status]}
            </div>
            <div>
              <p
                className={`text-label-md ${event.status === 'pending' ? 'text-text-secondary' : 'text-text-primary'}`}
              >
                {event.title}
              </p>
              <p className="text-label-sm text-text-secondary">{event.description}</p>
            </div>
            <time className="text-label-sm text-text-secondary">{event.timestamp}</time>
          </div>
        ))}
      </div>
    </Panel>
  )
}
