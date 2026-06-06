import Link from 'next/link'
import type { ReactNode } from 'react'

type Size = 'md' | 'lg'
type IconPosition = 'left' | 'right'

interface CommonProps {
  children: ReactNode
  size?: Size
  icon?: ReactNode
  iconPosition?: IconPosition
  className?: string
  disabled?: boolean
}

type GhostButtonProps =
  | (CommonProps & { href: string; onClick?: never; type?: never })
  | (CommonProps & { href?: undefined; onClick?: () => void; type?: 'button' | 'submit' })

const sizeClasses: Record<Size, string> = {
  md: 'px-6 py-2.5 text-label-md',
  lg: 'px-8 py-4 text-body-md',
}

export function GhostButton({
  children,
  size = 'md',
  icon,
  iconPosition = 'right',
  className = '',
  disabled = false,
  ...rest
}: GhostButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl bg-glass-fill border border-glass-border font-bold text-text-primary transition-colors hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${sizeClasses[size]} ${className}`
  const content = (
    <>
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </>
  )
  if ('href' in rest && rest.href) {
    return <Link href={rest.href} className={base}>{content}</Link>
  }
  const { onClick, type = 'button' } = rest as { onClick?: () => void; type?: 'button' | 'submit' }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {content}
    </button>
  )
}
