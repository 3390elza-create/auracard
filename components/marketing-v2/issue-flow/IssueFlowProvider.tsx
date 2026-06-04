'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'

// Loaded only when the modal opens — pulls the wagmi/AppKit bundle into a
// separate on-demand chunk so it stays off the marketing page's first load.
const IssueCardFlow = dynamic(
  () => import('./IssueCardFlowWithProviders').then((m) => m.IssueCardFlowWithProviders),
  { ssr: false },
)

interface IssueFlowContextValue {
  open: () => void
}

const IssueFlowContext = createContext<IssueFlowContextValue | null>(null)

export function useIssueFlow(): IssueFlowContextValue {
  const ctx = useContext(IssueFlowContext)
  if (!ctx) throw new Error('useIssueFlow must be used within an IssueFlowProvider')
  return ctx
}

export function IssueFlowProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const value = useMemo(() => ({ open }), [open])

  return (
    <IssueFlowContext.Provider value={value}>
      {children}
      {isOpen && <IssueCardFlow onClose={close} />}
    </IssueFlowContext.Provider>
  )
}
