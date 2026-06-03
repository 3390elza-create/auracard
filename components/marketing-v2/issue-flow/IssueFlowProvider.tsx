'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { IssueCardFlow } from './IssueCardFlow'

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
