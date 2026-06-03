import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: ReactNode
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="mx-auto max-w-3xl space-y-4 py-16 text-center md:py-24">
      {eyebrow && (
        <span className="text-label-sm uppercase tracking-widest text-aurora-teal">{eyebrow}</span>
      )}
      <h1 className="text-headline-lg text-text-primary">{title}</h1>
      {description && (
        <p className="text-body-lg text-text-secondary">{description}</p>
      )}
    </header>
  )
}
