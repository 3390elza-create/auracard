import type { ReactNode } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { Footer } from '@/components/layout/Footer'

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-container-max px-gutter md:px-margin-desktop">
        {children}
      </main>
      <Footer />
    </>
  )
}
