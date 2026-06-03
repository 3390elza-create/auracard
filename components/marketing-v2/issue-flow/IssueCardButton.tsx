'use client'

import type { ReactNode } from 'react'
import { useIssueFlow } from './IssueFlowProvider'

// Drop-in replacement for the landing CTA links: opens the Issue-Card modal flow
// instead of navigating. Each call site passes its own className so the button
// keeps the exact styling of the link it replaces.
export function IssueCardButton({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const { open } = useIssueFlow()
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  )
}
