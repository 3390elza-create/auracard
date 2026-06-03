import { Plus } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { FAQS } from '@/lib/content/marketing'

export function FaqList() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {FAQS.map(({ question, answer }) => (
        <Panel key={question} as="details" rounded="xl" className="group p-stack-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-headline-md text-text-primary [&::-webkit-details-marker]:hidden">
            {question}
            <Plus
              className="h-5 w-5 shrink-0 text-aurora-teal transition-transform group-open:rotate-45"
              aria-hidden
            />
          </summary>
          <p className="pt-4 text-body-md text-text-secondary">{answer}</p>
        </Panel>
      ))}
    </div>
  )
}
